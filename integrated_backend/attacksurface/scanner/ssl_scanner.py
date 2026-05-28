import json
import logging
import os
import socket
import ssl
import tempfile
from datetime import datetime
from pathlib import Path

logger = logging.getLogger(__name__)


def _compute_ssl_grade(cert, tls_version):
    """Compute an SSL grade (A+ through F) based on cert properties."""
    if not cert:
        return "F"
    score = 100
    tls_ver = (tls_version or "").upper()
    if "SSLv2" in tls_ver or "SSLv3" in tls_ver:
        score -= 50
    elif "TLSv1.0" in tls_ver or "TLSv1" == tls_ver.strip():
        score -= 30
    elif "TLSv1.1" in tls_ver:
        score -= 20
    elif "TLSv1.3" in tls_ver:
        score += 5
    try:
        nb = cert.get("notBefore", "")
        na = cert.get("notAfter", "")
        date_fmt = "%b %d %H:%M:%S %Y %Z"
        if nb and na:
            not_before = datetime.strptime(nb, date_fmt)
            not_after = datetime.strptime(na, date_fmt)
            now = datetime.utcnow()
            if now < not_before:
                score -= 40
            days_left = (not_after - now).days
            if days_left < 0:
                score -= 80
            elif days_left < 30:
                score -= 30
            elif days_left < 90:
                score -= 10
    except (ValueError, TypeError):
        pass
    sig_algo = (cert.get("signatureAlgorithm") or "").upper()
    if "MD5" in sig_algo or "SHA1" in sig_algo:
        score -= 30
    elif "SHA256" in sig_algo or "SHA384" in sig_algo or "SHA512" in sig_algo:
        score += 5
    subject_raw = cert.get("subject", [])
    cn = ""
    for part in subject_raw:
        if isinstance(part, tuple):
            for kv in part:
                if isinstance(kv, tuple) and len(kv) >= 2 and kv[0] == "commonName":
                    cn = kv[1]
        elif isinstance(part, list):
            for kv in part:
                if isinstance(kv, tuple) and len(kv) >= 2 and kv[0] == "commonName":
                    cn = kv[1]
    if cn.startswith("*."):
        score -= 5
    if score >= 95:
        return "A+"
    elif score >= 80:
        return "A"
    elif score >= 65:
        return "B"
    elif score >= 50:
        return "C"
    elif score >= 30:
        return "D"
    else:
        return "F"


def _cert_issuer_str(issuer_parts):
    """Convert cert issuer tuple-of-tuples to a readable string."""
    pairs = []
    for part in issuer_parts:
        if isinstance(part, tuple):
            for kv in part:
                if isinstance(kv, tuple) and len(kv) >= 2:
                    pairs.append(f"{kv[0]}={kv[1]}")
        elif isinstance(part, list):
            for kv in part:
                if isinstance(kv, tuple) and len(kv) >= 2:
                    pairs.append(f"{kv[0]}={kv[1]}")
    return "; ".join(pairs) if pairs else str(issuer_parts)


def run_testssl(targets):
    """SSL/TLS certificate checker using Python ssl module (no external deps)."""
    if not targets:
        return []
    results = []
    for raw_target in targets[:1]:
        host = raw_target.replace("https://", "").replace("http://", "").split("/")[0].split(":")[0]
        ip_addr = None
        rdns = None
        try:
            try:
                ai = socket.getaddrinfo(host, 443, socket.AF_INET)
                if ai:
                    ip_addr = ai[0][4][0]
                    try:
                        rdns = socket.gethostbyaddr(ip_addr)[0]
                    except (socket.herror, socket.gaierror):
                        rdns = host
            except socket.gaierror:
                pass
            ctx = ssl.create_default_context()
            ctx.check_hostname = True
            ctx.verify_mode = ssl.CERT_REQUIRED
            with socket.create_connection((host, 443), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=host) as tls:
                    cert = tls.getpeercert()
                    actual_cipher = tls.cipher()
                    version = tls.version()
            if not cert:
                results.append(_error_result(host, "No certificate", ip_addr, rdns))
                continue
            not_before = cert.get("notBefore", "")
            not_after = cert.get("notAfter", "")
            issuer = _cert_issuer_str(cert.get("issuer", []))
            cipher_suite = f"{actual_cipher[0]} ({version})" if actual_cipher else ""
            grade = _compute_ssl_grade(cert, version)
            is_trusted = True
            try:
                ctx2 = ssl.create_default_context()
                ctx2.check_hostname = True
                ctx2.verify_mode = ssl.CERT_REQUIRED
                with socket.create_connection((host, 443), timeout=10) as sock:
                    with ctx2.wrap_socket(sock, server_hostname=host) as tls:
                        tls.getpeercert()
            except ssl.SSLCertVerificationError:
                is_trusted = False
            except Exception:
                pass
            results.append({
                "host": host,
                "ssl_grade": grade,
                "issuer": issuer,
                "ip": ip_addr or host,
                "rdns": rdns or "",
                "expiry_date": not_after,
                "purchase_date": not_before,
                "cipher_suite": cipher_suite,
                "is_trusted": is_trusted,
            })
        except ssl.SSLError as e:
            results.append(_error_result(host, f"SSL error: {e}", ip_addr, rdns))
        except (socket.timeout, ConnectionRefusedError, ConnectionResetError, OSError) as e:
            results.append(_error_result(host, f"Connection error: {e}", host, ""))
        except Exception as e:
            logger.exception("SSL check failed for %s: %s", host, e)
            results.append(_error_result(host, str(e), host, ""))
    return results


def _error_result(host, error_msg, ip, rdns):
    return {
        "host": host,
        "ssl_grade": "F",
        "issuer": "",
        "ip": ip or host,
        "rdns": rdns or "",
        "expiry_date": "",
        "purchase_date": "",
        "cipher_suite": str(error_msg),
        "is_trusted": False,
    }
