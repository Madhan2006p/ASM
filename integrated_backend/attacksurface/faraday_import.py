"""
Faraday vulnerability import helper.

Sends vulnerability data directly to Faraday's API using the credentials
configured in Django settings.  This bypasses the external Faraday pipeline
service and connects to Faraday on port 5985 directly.
"""

import json
import logging
from typing import Any, Dict, List, Optional

import requests
from django.conf import settings

logger = logging.getLogger(__name__)


class FaradayImportError(Exception):
    pass


def _faraday_api(path: str) -> str:
    base = str(getattr(settings, "FARADAY_URL", "http://localhost:5985")).rstrip("/")
    return f"{base}/_api/v3/{path.lstrip('/')}"


def _authenticate(session: requests.Session) -> None:
    """Authenticate to Faraday API and set the auth token on the session."""
    base = str(getattr(settings, "FARADAY_URL", "http://localhost:5985")).rstrip("/")
    username = str(getattr(settings, "FARADAY_USERNAME", "faraday"))
    password = str(getattr(settings, "FARADAY_PASSWORD", "changeme"))
    verify = bool(getattr(settings, "FARADAY_VERIFY_SSL", False))

    # Try email first, then username
    for login_field in ("email", "username"):
        try:
            resp = session.post(
                f"{base}/_api/login",
                json={login_field: username, "password": password},
                verify=verify,
                timeout=30,
            )
            if resp.status_code == 200:
                payload = resp.json()
                token = payload.get("token") or payload.get("access_token") or payload.get("jwt")
                if token:
                    session.headers.update({"Authorization": f"Bearer {token}"})
                    return
        except requests.RequestException:
            continue

    # Fallback to HTTP Basic Auth
    session.auth = (username, password)


def _ensure_workspace(session: requests.Session, workspace: str) -> None:
    """Ensure the Faraday workspace exists."""
    verify = bool(getattr(settings, "FARADAY_VERIFY_SSL", False))
    resp = session.get(_faraday_api(f"ws/{workspace}"), verify=verify, timeout=30)
    if resp.status_code == 200:
        return
    session.post(
        _faraday_api("ws/"),
        json={"name": workspace, "description": "ASM vulnerability imports", "active": True},
        verify=verify,
        timeout=30,
    )


def _asm_vuln_to_faraday(vuln: Dict[str, Any], index: int) -> Dict[str, Any]:
    """Convert an ASM vulnerability to Faraday vulnerability format."""
    severity = str(vuln.get("severity") or "info").lower()
    title = vuln.get("vulnerability_id") or vuln.get("template_id") or f"ASM Vulnerability {index}"
    description = vuln.get("finding") or vuln.get("description") or ""
    cve = vuln.get("cve") or ""
    cwe = vuln.get("cwe") or ""
    target = vuln.get("subdomain") or vuln.get("domain") or ""
    template_id = vuln.get("template_id") or vuln.get("vulnerability_id") or f"asm-{index}"
    source_tool = vuln.get("source_tool") or "ASM"
    references = []
    if cve:
        references.append(f"https://nvd.nist.gov/vuln/detail/{cve}")

    return {
        "name": f"[{source_tool}] {title}",
        "desc": description or f"Vulnerability found on {target}",
        "severity": severity,
        "resolution": "Review the affected endpoint and apply vendor guidance.",
        "refs": references,
        "status": "opened",
        "external_id": template_id,
        "target": target,
        "data": json.dumps({
            "cve": cve or None,
            "cwe": cwe or None,
            "source_tool": source_tool,
            "domain": vuln.get("domain", ""),
        }, default=str),
    }


def _get_authenticated_session() -> Optional[requests.Session]:
    """Create and return an authenticated Faraday session, or None on failure."""
    session = requests.Session()
    try:
        _authenticate(session)
        return session
    except Exception:
        session.close()
        return None


def fetch_faraday_findings() -> Dict[str, Any]:
    """
    Fetch findings from Faraday's API directly.

    Returns a dict with 'findings' list and a 'connected' flag.
    """
    workspace = str(getattr(settings, "FARADAY_WORKSPACE", "nuclei-asm"))
    verify = bool(getattr(settings, "FARADAY_VERIFY_SSL", False))

    session = _get_authenticated_session()
    if not session:
        return {"findings": [], "connected": False, "error": "Could not connect to Faraday. Ensure Faraday server is running."}

    try:
        base = str(getattr(settings, "FARADAY_URL", "http://localhost:5985")).rstrip("/")
        api_path = f"{base}/_api/v3/ws/{workspace}/vulns/"

        all_findings = []
        url = api_path
        while url:
            resp = session.get(url, verify=verify, timeout=30)
            if resp.status_code != 200:
                break
            payload = resp.json()
            if isinstance(payload, list):
                all_findings.extend(payload)
                break
            else:
                all_findings.extend(payload.get("results", []))
                url = payload.get("next")

        # Normalize findings to match frontend expectations
        normalized = []
        for item in all_findings:
            severity = str(item.get("severity") or "Info").capitalize()
            data_raw = item.get("data")
            parsed_data = {}
            if isinstance(data_raw, str):
                try:
                    parsed_data = json.loads(data_raw)
                except json.JSONDecodeError:
                    pass
            cve = parsed_data.get("cve") or item.get("cve") or ""
            cwe = parsed_data.get("cwe") or item.get("cwe") or ""
            normalized.append({
                "finding_id": 1_000_000_000 + int(item.get("id") or item.get("_id") or 0),
                "title": item.get("name") or "Untitled finding",
                "severity": severity,
                "cve": cve if cve != "-" else "",
                "cwe": cwe if cwe != "-" else "",
                "description": item.get("desc") or "",
                "mitigation": item.get("resolution") or "",
                "endpoint": item.get("target") or "",
                "active": str(item.get("status") or "opened").lower() not in {"closed", "confirmed closed", "false positive"},
                "date_found": item.get("create_date") or item.get("created_at") or "",
            })

        return {"findings": normalized, "connected": True}

    except requests.RequestException as exc:
        logger.error("Failed to fetch Faraday findings: %s", exc)
        return {"findings": [], "connected": False, "error": f"Faraday connection failed: {exc}"}
    finally:
        session.close()


def fetch_faraday_summary() -> Dict[str, Any]:
    """
    Fetch summary/counts from Faraday's API directly.
    """
    findings_data = fetch_faraday_findings()
    findings = findings_data.get("findings", [])

    counts = {"Critical": 0, "High": 0, "Medium": 0, "Low": 0}
    for finding in findings:
        severity = str(finding.get("severity") or "").capitalize()
        if severity in counts:
            counts[severity] += 1

    total = sum(counts.values())
    # Simple risk score calculation
    score = min(100, counts.get("Critical", 0) * 10 + counts.get("High", 0) * 5 + counts.get("Medium", 0) * 2)

    if score >= 50:
        level = "Critical"
    elif score >= 30:
        level = "High"
    elif score >= 15:
        level = "Medium"
    else:
        level = "Low"

    return {
        "total_findings": total,
        "critical_count": counts["Critical"],
        "high_count": counts["High"],
        "medium_count": counts["Medium"],
        "low_count": counts["Low"],
        "risk_score": score,
        "risk_level": level,
    }


def import_vulnerabilities_to_faraday(asm_vulns: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Import vulnerabilities directly into Faraday.

    Args:
        asm_vulns: List of vulnerability dicts in ASM format.

    Returns:
        Dict with 'status', 'created' count, and optional 'errors'.
    """
    if not asm_vulns:
        return {"status": "skipped", "created": 0}

    workspace = str(getattr(settings, "FARADAY_WORKSPACE", "nuclei-asm"))
    verify = bool(getattr(settings, "FARADAY_VERIFY_SSL", False))

    session = requests.Session()
    try:
        _authenticate(session)
        _ensure_workspace(session, workspace)

        created = 0
        errors = []

        for index, vuln in enumerate(asm_vulns, start=1):
            try:
                payload = _asm_vuln_to_faraday(vuln, index)
                resp = session.post(
                    _faraday_api(f"ws/{workspace}/vulns/"),
                    json=payload,
                    verify=verify,
                    timeout=60,
                )
                if resp.status_code in (200, 201):
                    created += 1
                else:
                    errors.append({"index": index, "status": resp.status_code, "detail": resp.text[:200]})
            except Exception as exc:
                errors.append({"index": index, "error": str(exc)})

        result = {"status": "completed", "created": created}
        if errors:
            result["errors"] = errors
            logger.warning("Faraday import completed with %d errors: %s", len(errors), errors[:3])
        return result

    except requests.RequestException as exc:
        logger.error("Faraday connection failed: %s", exc)
        return {"status": "failed", "created": 0, "errors": [{"error": str(exc)}]}
    finally:
        session.close()
