import asyncio
import json
import logging
import os
import re
import subprocess
import tempfile
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)

from .models import (
    AttackSurfaceScan,
    DirectoryResult,
    EmailSecurityResult,
    EndpointResult,
    PortResult,
    SSLResult,
    SubdomainResult,
    TechnologyResult,
    VulnerabilityResult,
)

WAPPALYZER_AVAILABLE = False
try:
    from Wappalyzer import Wappalyzer, WebPage
    WAPPALYZER_AVAILABLE = True
except ImportError:
    pass

# Wappalyzer/header-detected tech names → nuclei tags for targeted scanning
TECH_TO_TAGS = {
    "nginx": {"nginx"},
    "apache": {"apache"},
    "apache http server": {"apache"},
    "wordpress": {"wordpress", "wp"},
    "php": {"php"},
    "drupal": {"drupal"},
    "joomla": {"joomla"},
    "laravel": {"laravel"},
    "django": {"django"},
    "flask": {"flask"},
    "express": {"express"},
    "react": {"react"},
    "angular": {"angular"},
    "vue": {"vue"},
    "vue.js": {"vue"},
    "next.js": {"nextjs"},
    "nuxt.js": {"nuxt"},
    "jquery": {"jquery"},
    "cloudflare": {"cloudflare"},
    "iis": {"iis"},
    "microsoft iis": {"iis"},
    "asp.net": {"asp", "microsoft"},
    "java": {"java", "j2ee"},
    "openresty": {"openresty"},
    "caddy": {"caddy"},
    "gunicorn": {"gunicorn"},
    "ruby on rails": {"rails"},
    "shopify": {"shopify"},
    "tomcat": {"tomcat", "java"},
    "jenkins": {"jenkins"},
    "gitlab": {"gitlab"},
    "jira": {"jira"},
    "confluence": {"confluence"},
    "prestashop": {"prestashop"},
    "magento": {"magento"},
    "vbulletin": {"vbulletin"},
    "thinkphp": {"thinkphp"},
    "spring boot": {"springboot", "spring"},
    "spring": {"spring", "springboot"},
    "node.js": {"node"},
    "python": {"python"},
    "ruby": {"ruby"},
    "fastjson": {"fastjson"},
    "thinkcmf": {"thinkcmf"},
    "seeyon": {"seeyon"},
    "weaver": {"weaver"},
    "yonyou": {"yonyou"},
    "tongda": {"tongda"},
    "landray": {"landray"},
    "sangfor": {"sangfor"},
    "huawei": {"huawei"},
    "cisco": {"cisco"},
    "vmware": {"vmware"},
    "oracle": {"oracle"},
    "ibm": {"ibm"},
    "samsung": {"samsung"},
    "zabbix": {"zabbix"},
    "nagios": {"nagios"},
    "phpmyadmin": {"phpmyadmin"},
    "phpstudy": {"phpstudy"},
    "grafana": {"grafana"},
    "prometheus": {"prometheus"},
    "kibana": {"kibana"},
    "elasticsearch": {"elasticsearch"},
    "redis": {"redis"},
    "mongodb": {"mongo"},
    "mysql": {"mysql"},
    "mariadb": {"mariadb"},
    "postgresql": {"postgresql"},
    "rabbitmq": {"rabbitmq"},
    "kafka": {"kafka"},
    "docker": {"docker"},
    "kubernetes": {"kubernetes"},
    "rancher": {"rancher"},
    "openshift": {"openshift"},
    "ansible": {"ansible"},
    "terraform": {"terraform"},
    "vault": {"vault"},
    "consul": {"consul"},
    "etcd": {"etcd"},
}


def techs_to_nuclei_tags(tech_list):
    """Map detected technology names to nuclei template tags."""
    tags = set()
    seen = set()
    for tech in tech_list:
        key = tech.strip().lower()
        if key in seen:
            continue
        seen.add(key)
        # direct lookup
        if key in TECH_TO_TAGS:
            tags.update(TECH_TO_TAGS[key])
        else:
            # try partial match against known keys
            matched = False
            for known_key, known_tags in TECH_TO_TAGS.items():
                if known_key in key or key in known_key:
                    tags.update(known_tags)
                    matched = True
                    break
            if not matched:
                # use the tech name itself as a candidate tag
                tags.add(key.replace(" ", "-").replace("_", "-"))
    # always include generic useful tags
    tags.update({"cve", "misconfiguration", "exposure", "default-login"})
    return sorted(tags)


def resolve_tool(tool_name, env_var, candidates=None):
    env_path = os.environ.get(env_var)
    if env_path and Path(env_path).exists():
        return env_path
    path = os.popen(f"which {tool_name} 2>/dev/null").read().strip()
    if path:
        return path
    if isinstance(candidates, str):
        candidates = [candidates]
    for c in candidates or []:
        p = Path(c)
        if p.exists():
            return str(p)
    return None


def run_cmd(cmd, timeout=120, input_data=None, env=None):
    try:
        r = subprocess.run(
            cmd, capture_output=True, text=True, timeout=timeout, input=input_data,
            env=env,
        )
        if r.returncode != 0:
            logger.warning("run_cmd %s exited %d: %s", cmd[0], r.returncode, r.stderr[:200])
        return {"stdout": r.stdout or "", "stderr": r.stderr or "", "returncode": r.returncode}
    except FileNotFoundError:
        logger.error("run_cmd %s not found on system", cmd[0])
        return {"stdout": "", "stderr": f"{cmd[0]} not found", "returncode": -1}
    except subprocess.TimeoutExpired:
        logger.warning("run_cmd %s timed out after %ss", cmd[0], timeout)
        return {"stdout": "", "stderr": f"Timed out after {timeout}s", "returncode": -1}


# ── Subfinder ────────────────────────────────────────────────────────────────

try:
    import dns.resolver
    DNS_RESOLVER_AVAILABLE = True
except ImportError:
    DNS_RESOLVER_AVAILABLE = False

COMMON_SUBDOMAINS = [
    "www", "mail", "ftp", "admin", "api", "blog", "webmail", "dev", "test",
    "shop", "app", "m", "mobile", "en", "support", "help", "forum", "news",
    "wiki", "store", "portal", "status", "cdn", "static", "media", "img",
    "assets", "download", "downloads", "docs", "jenkins", "jira", "gitlab",
    "bitbucket", "svn", "git", "vpn", "remote", "owa", "exchange", "lyncdiscover",
    "autodiscover", "sip", "meet", "confluence", "lms", "moodle", "blackboard",
    "cpanel", "whm", "webdisk", "cpcalendars", "cpcontacts", "mail1", "mail2",
    "smtp", "pop3", "imap", "mx", "ns1", "ns2", "dns1", "dns2", "dns",
    "direct-connect", "remote-desktop", "rdp", "ssh", "telnet", "sftp",
    "monitor", "monitoring", "nagios", "zabbix", "grafana", "prometheus",
    "dashboard", "manager", "management", "console", "panel", "control",
    "adminer", "phpmyadmin", "phppgadmin", "admin-console", "admin-panel",
    "backend", "api-dev", "api-staging", "staging", "stage", "beta", "alpha",
    "demo", "sandbox", "v2", "v1", "v3", "old", "new", "secure", "ssl",
    "web", "server", "ns", "mx1", "mx2", "s1", "s2", "ws", "chat", "video",
    "stream", "live", "tv", "radio", "podcast", "calendar", "cloud",
    "ecommerce", "partner", "partners", "affiliate", "reseller",
    "billing", "invoice", "account", "accounts", "profile", "user", "users",
    "login", "register", "signup", "signin", "auth", "oauth", "sso",
    "idp", "saml", "openid", "connect", "callback", "redirect", "logout",
    "search", "sitemap", "robots", "crossdomain", "clientaccesspolicy",
    "feed", "feeds", "rss", "atom", "xmlrpc", "soap", "wsdl", "graphql",
    "api-gateway", "gateway", "proxy", "lb", "loadbalancer", "ha",
    "autoconfig", "autodiscover", "msoid", "mtr", "smtp2", "pop3",
    "owa1", "owa2", "ecp", "ews", "mapi", "rpc", "rpc2", "nfs", "s3",
    "s3-bucket", "bucket", "storage", "object", "uploads", "upload",
    "assets", "fonts", "css", "js", "scripts", "themes", "plugins",
    "extensions", "modules", "components", "widgets", "blocks",
    "content", "public", "private", "protected", "config", "configuration",
    "setup", "install", "installer", "wizard", "firstrun", "init",
    "migration", "upgrade", "update", "patch", "fix", "hotfix",
    "backup", "restore", "snapshot", "clone", "replica", "replication",
    "master", "slave", "primary", "secondary", "standby", "failover",
    "dr", "disaster-recovery", "bcdr", "continuity",
    "compliance", "audit", "auditor", "legal", "privacy", "gdpr",
    "tickets", "helpdesk", "service-desk", "itsm", "servicenow",
    "splunk", "elk", "elastic", "logstash", "kibana", "log", "logs",
    "analytics", "stats", "statistics", "usage", "traffic",
    "metrics", "metric", "alerts", "alert", "notification",
    "pagerduty", "opsgenie", "victorops", "xmpp", "irc", "slack",
    "teams", "zoom", "webex", "gotomeeting", "adobeconnect",
    "bigbluebutton", "jitsi", "meet", "talk", "phone", "call",
    "voip", "sip", "h323", "rtp", "rtsp", "streaming",
    "vnc", "teamviewer", "anydesk", "logmein", "gotoassist",
    "docker", "k8s", "kubernetes", "swarm", "nomad", "consul",
    "etcd", "vault", "puppet", "chef", "ansible", "salt",
    "saltstack", "terraform", "packer", "vagrant", "rancher",
    "openshift", "okd", "crunchy", "pgadmin", "mysql", "mariadb",
    "mongo", "mongodb", "redis", "memcached", "couchdb", "cassandra",
    "elasticsearch", "solr", "sphinx", "neo4j", "orientdb",
    "influxdb", "timescaledb", "citus", "cockroachdb", "yugabyte",
    "couchbase", "riak", "hbase", "hadoop", "spark", "storm",
    "kafka", "pulsar", "rabbitmq", "activemq", "nats", "zeromq",
    "nsq", "sqs", "pubsub", "eventbus", "events", "event",
    "webhook", "webhooks", "callback", "notify", "notification",
]

def run_subfinder(target):
    """Discover subdomains using DNS resolution of common subdomains."""
    target = target.strip().lower()
    if target.startswith("http://") or target.startswith("https://"):
        target = urlparse(target).hostname or target

    found = set()

    # Try subfinder binary first (quick test — skip if it hangs)
    exe = resolve_tool("subfinder", "SUBFINDER_PATH",
                       getattr(settings, "SUBFINDER_PATH", None))
    if exe:
        r = run_cmd([exe, "-d", target, "-silent"], timeout=8)
        if r["returncode"] == 0:
            for line in r["stdout"].splitlines():
                s = line.strip()
                if s and s.endswith(target):
                    found.add(s)

    # DNS-based brute-force using dnspython (parallel)
    if DNS_RESOLVER_AVAILABLE:
        def _check_domain(domain_to_check):
            r = dns.resolver.Resolver()
            r.timeout = 3
            r.lifetime = 3
            try:
                answers = r.resolve(domain_to_check, "A")
                if answers:
                    return domain_to_check
            except Exception:
                pass
            return None

        with ThreadPoolExecutor(max_workers=50) as pool:
            fut_to_domain = {
                pool.submit(_check_domain, f"{sub}.{target}"): sub
                for sub in COMMON_SUBDOMAINS
            }
            for fut in as_completed(fut_to_domain):
                result = fut.result()
                if result:
                    found.add(result)

        # Also check the bare domain
        try:
            r = dns.resolver.Resolver()
            r.timeout = 3
            r.lifetime = 3
            answers = r.resolve(target, "A")
            if answers:
                found.add(target)
        except Exception:
            pass

    return sorted(found)


# ── Live Host Probing (Python httpx) ─────────────────────────────────────────

def probe_url(client, url):
    """Probe a single URL and return structured data."""
    try:
        resp = client.get(url, follow_redirects=True)
    except Exception:
        return None

    title = None
    if resp.text:
        m = re.search(r'<title[^>]*>(.*?)</title>', resp.text, re.IGNORECASE | re.DOTALL)
        if m:
            title = m.group(1).strip()[:200]

    content_type = resp.headers.get("content-type", "")
    server = resp.headers.get("server", "")
    techs = []
    if server:
        techs.append(server)

    return {
        "url": str(resp.url),
        "status_code": resp.status_code,
        "content_type": content_type,
        "content_length": len(resp.content),
        "title": title or "",
        "tech": techs,
        "webserver": server,
        "headers": dict(resp.headers),
        "body_preview": resp.text[:2000],
    }


def run_httpx(domains):
    """Probe domains using Python httpx library (no external binary needed)."""
    if not domains:
        return []

    targets = list(set(domains[:20]))
    urls = []
    for d in targets:
        if d.startswith("http://") or d.startswith("https://"):
            urls.append(d)
        else:
            urls.append(f"https://{d}")
            urls.append(f"http://{d}")

    results = []
    try:
        timeout = httpx.Timeout(connect=5.0, read=10.0, write=10.0, pool=5.0)
        with httpx.Client(verify=False, timeout=timeout) as client:
            with ThreadPoolExecutor(max_workers=10) as pool:
                fut_to_url = {pool.submit(probe_url, client, u): u for u in urls}
                for fut in as_completed(fut_to_url):
                    try:
                        data = fut.result()
                        if data:
                            results.append(data)
                    except Exception:
                        pass
    except Exception:
        pass

    return results


# ── Wappalyzer Technology Detection ──────────────────────────────────────────

def run_wappalyzer(targets):
    """Use python-Wappalyzer for tech stack detection."""
    if not WAPPALYZER_AVAILABLE or not targets:
        return []

    try:
        wappalyzer = Wappalyzer.latest()
    except Exception:
        return []

    results = []
    for t in targets[:10]:
        url = t if (t.startswith("http://") or t.startswith("https://")) else f"https://{t}"
        try:
            webpage = WebPage.new_from_url(url, timeout=15)
            techs = wappalyzer.analyze(webpage)
            if techs:
                host = urlparse(url).hostname or t
                results.append({
                    "domain": host,
                    "url": url,
                    "technologies": sorted(techs),
                })
        except Exception:
            pass
    return results


# ── Whatweb-like HTTP Header & Meta Analysis ─────────────────────────────────

WHATWEB_COMMON_TECHS = {
    "nginx": {"name": "Nginx", "category": "Web Server"},
    "apache": {"name": "Apache HTTP Server", "category": "Web Server"},
    "cloudflare": {"name": "Cloudflare", "category": "CDN"},
    "openresty": {"name": "OpenResty", "category": "Web Server"},
    "iis": {"name": "Microsoft IIS", "category": "Web Server"},
    "caddy": {"name": "Caddy", "category": "Web Server"},
    "gunicorn": {"name": "Gunicorn", "category": "Web Server"},
    "express": {"name": "Express", "category": "Web Framework"},
    "django": {"name": "Django", "category": "Web Framework"},
    "flask": {"name": "Flask", "category": "Web Framework"},
    "rails": {"name": "Ruby on Rails", "category": "Web Framework"},
    "laravel": {"name": "Laravel", "category": "Web Framework"},
    "wordpress": {"name": "WordPress", "category": "CMS"},
    "drupal": {"name": "Drupal", "category": "CMS"},
    "joomla": {"name": "Joomla", "category": "CMS"},
    "shopify": {"name": "Shopify", "category": "Ecommerce"},
    "react": {"name": "React", "category": "JavaScript Framework"},
    "angular": {"name": "Angular", "category": "JavaScript Framework"},
    "vue": {"name": "Vue.js", "category": "JavaScript Framework"},
    "nextjs": {"name": "Next.js", "category": "JavaScript Framework"},
    "nuxt": {"name": "Nuxt.js", "category": "JavaScript Framework"},
    "jquery": {"name": "jQuery", "category": "JavaScript Library"},
}


def run_header_tech_analysis(targets, httpx_results):
    """Analyze HTTP response headers and body for technology fingerprints."""
    tech_map = {}

    for data in httpx_results:
        url = data.get("url", "")
        host = urlparse(url).hostname or ""
        if not host:
            continue
        found = set()
        server = (data.get("webserver") or "").lower()
        headers = data.get("headers", {})
        body = (data.get("body_preview") or "").lower()
        title = (data.get("title") or "").lower()

        # Server header
        for key, info in WHATWEB_COMMON_TECHS.items():
            if key in server:
                found.add(info["name"])
            if key in body or key in title:
                found.add(info["name"])

        # Set-Cookie based detection
        set_cookie = headers.get("set-cookie", "")
        if "wordpress" in (set_cookie or "").lower() or "wp-content" in body:
            found.add("WordPress")
        if "laravel_session" in set_cookie:
            found.add("Laravel")
        if "drupal" in (set_cookie or "").lower():
            found.add("Drupal")
        if "PHPSESSID" in set_cookie:
            found.add("PHP")
        if "JSESSIONID" in set_cookie:
            found.add("Java")
        if "asp.net" in (set_cookie or "").lower() or "aspsessionid" in set_cookie.lower():
            found.add("ASP.NET")

        # X-Powered-By header
        xpb = (headers.get("x-powered-by") or "").lower()
        if "express" in xpb:
            found.add("Express")
        if "asp.net" in xpb:
            found.add("ASP.NET")
        if "php" in xpb:
            found.add("PHP")
        if "django" in xpb:
            found.add("Django")
        if "flask" in xpb or "werkzeug" in xpb:
            found.add("Flask")

        # X-Generator header
        xgen = (headers.get("x-generator") or "").lower()
        if "drupal" in xgen:
            found.add("Drupal")
        if "wordpress" in xgen:
            found.add("WordPress")

        if host not in tech_map:
            tech_map[host] = set()
        tech_map[host].update(found)

    # Also enrich httpx tech field
    for data in httpx_results:
        url = data.get("url", "")
        host = urlparse(url).hostname or ""
        if host in tech_map:
            data["tech"] = list(set(data.get("tech", []) + list(tech_map[host])))

    return tech_map


# ── Nmap ─────────────────────────────────────────────────────────────────────

def run_nmap(targets):
    exe = resolve_tool("nmap", "NMAP_PATH",
                       getattr(settings, "NMAP_PATH", None))
    if not exe or not targets:
        return []
    targets = targets[:3]
    args = [exe, "--top-ports", "20", "-Pn", "-T4", "-oX", "-"]
    if len(targets) == 1:
        args.append(targets[0])
    else:
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("\n".join(targets))
            infile = f.name
        args.extend(["-iL", infile])
    r = run_cmd(args, timeout=120)
    if len(targets) > 1:
        Path(infile).unlink(missing_ok=True)
    return parse_nmap_xml(r["stdout"])


def parse_nmap_xml(xml_output):
    if not xml_output.strip():
        return []
    try:
        import xml.etree.ElementTree as ET
        root = ET.fromstring(xml_output)
    except Exception:
        return []
    hosts = []
    for host in root.findall("host"):
        addr = None
        for a in host.findall("address"):
            if a.get("addrtype") in ("ipv4", "ipv6"):
                addr = a.get("addr")
                break
        if not addr:
            continue
        hname = host.find("./hostnames/hostname")
        hostname = hname.get("name") if hname is not None else addr
        ports = []
        for p in host.findall("./ports/port"):
            state = p.find("state")
            svc = p.find("service")
            if state is not None and state.get("state") == "open":
                ports.append({
                    "port": int(p.get("portid")),
                    "protocol": p.get("protocol"),
                    "service": svc.get("name") if svc is not None else None,
                    "product": svc.get("product") if svc is not None else None,
                    "version": svc.get("version") if svc is not None else None,
                })
        hosts.append({"address": addr, "hostname": hostname, "ports": ports})
    return hosts


# ── Nuclei ───────────────────────────────────────────────────────────────────

def run_nuclei(targets, tech_tags=None):
    exe = resolve_tool("nuclei", "NUCLEI_PATH",
                       getattr(settings, "NUCLEI_PATH", None))
    if not exe or not targets:
        return []
    targets = targets[:5]
    args = [exe, "-j", "-timeout", "5", "-retries", "1",
            "-rl", "30", "-bs", "10", "-c", "10"]
    if tech_tags:
        args.extend(["-tags", ",".join(tech_tags)])
    else:
        args.extend(["-severity", "high,critical"])
    if len(targets) == 1:
        args.extend(["-u", targets[0]])
    else:
        with tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".txt") as f:
            f.write("\n".join(targets))
            infile = f.name
        args.extend(["-l", infile])
    logger.info("nuclei command: %s", " ".join(str(a) for a in args[:8]))
    r = run_cmd(args, timeout=120)
    if len(targets) > 1:
        Path(infile).unlink(missing_ok=True)
    vulns = []
    for line in r["stdout"].splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            continue
        info = data.get("info", {})
        matched = data.get("matched-at") or data.get("url") or ""
        vulns.append({
            "template_id": data.get("template-id"),
            "name": info.get("name"),
            "severity": info.get("severity"),
            "type": data.get("type"),
            "protocol": data.get("protocol"),
            "target": matched,
            "host": data.get("host"),
            "timestamp": data.get("timestamp"),
            "cve": ", ".join(info.get("classification", {}).get("cve-id", [])) if info.get("classification") else None,
            "cwe": ", ".join(info.get("classification", {}).get("cwe-id", [])) if info.get("classification") else None,
        })
    return vulns


# ── Email Security ───────────────────────────────────────────────────────────

def run_email_security(domain):
    result = {
        "domain": domain,
        "root_txt": [], "spf": [], "dmarc": [], "mx": [],
        "dkim_selector1": [], "dkim_default": [],
        "smtp_hosts": [], "smtp_port_scan": {},
        "smtp_open_relay": {}, "smtp_starttls": {},
    }

    dig = resolve_tool("dig", "DIG_PATH", ["/usr/bin/dig", "/usr/local/bin/dig"])

    def dig_record(rtype, query_domain):
        if not dig:
            return []
        r = run_cmd([dig, "+short", rtype, query_domain], timeout=30)
        return [line.strip() for line in r["stdout"].splitlines() if line.strip()]

    result["root_txt"] = dig_record("TXT", domain)
    result["dmarc"] = dig_record("TXT", f"_dmarc.{domain}")
    result["dkim_selector1"] = dig_record("TXT", f"selector1._domainkey.{domain}")
    result["dkim_default"] = dig_record("TXT", f"default._domainkey.{domain}")
    result["mx"] = dig_record("MX", domain)
    result["spf"] = [r for r in result["root_txt"] if "v=spf1" in r.lower()]

    smtp_hosts = []
    for mx in result["mx"]:
        parts = mx.split()
        if parts:
            host = parts[-1].rstrip(".")
            if host and host != ".":
                smtp_hosts.append(host)
    if not smtp_hosts:
        smtp_hosts.append(f"mail.{domain}")
    result["smtp_hosts"] = smtp_hosts

    smtp_target = smtp_hosts[0]
    nmap_exe = resolve_tool("nmap", "NMAP_PATH",
                            getattr(settings, "NMAP_PATH", None))
    if nmap_exe:
        port_r = run_cmd([nmap_exe, "-Pn", "-p", "25,465,587", smtp_target], timeout=120)
        result["smtp_port_scan"] = {"raw": port_r["stdout"], "target": smtp_target}
        relay_r = run_cmd([nmap_exe, "-Pn", "--script", "smtp-open-relay", "-p", "25", smtp_target], timeout=120)
        result["smtp_open_relay"] = {"raw": relay_r["stdout"], "target": smtp_target}

    openssl = resolve_tool("openssl", "OPENSSL_PATH",
                           ["/usr/bin/openssl", "/usr/local/bin/openssl"])
    if openssl:
        starttls_r = run_cmd(
            [openssl, "s_client", "-starttls", "smtp", "-connect", f"{smtp_target}:25"],
            timeout=60, input_data="QUIT\n",
        )
        result["smtp_starttls"] = {"raw": starttls_r["stdout"], "target": smtp_target}

    return result


# ── Directory Scan (dirsearch) ─────────────────────────────────────────────

def run_directory_scan(targets):
    """Scan directories using dirsearch."""
    exe = resolve_tool("dirsearch", "DIRSEARCH_PATH",
                       getattr(settings, "DIRSEARCH_PATH", None))
    if not exe or not targets:
        return []
    results = []
    for target in targets[:3]:
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False, mode="w") as f:
            outpath = f.name
        try:
            r = run_cmd(
                [exe, "-u", target, "-O", "json", "-o", outpath,
                 "--timeout", "5", "-q", "--disable-cli"],
                timeout=60,
            )
            with open(outpath) as f:
                data = json.load(f)
            for entry in data.get("results", []):
                results.append({
                    "url": entry.get("url", ""),
                    "status": entry.get("status", 0),
                    "content_type": entry.get("content-type", ""),
                    "content_length": entry.get("content-length", 0),
                })
        except (json.JSONDecodeError, AttributeError, TypeError, FileNotFoundError):
            pass
        finally:
            Path(outpath).unlink(missing_ok=True)
    return results


# ── TestSSL ──────────────────────────────────────────────────────────────────

def run_testssl(targets):
    exe = resolve_tool("testssl.sh", "TESTSSL_PATH",
                       getattr(settings, "TESTSSL_PATH", None))
    if not exe or not targets:
        return []
    testssl_env = {**os.environ, "TESTSSL_INSTALL_DIR": str(Path(exe).resolve().parent)}
    results = []

    def _pick_first(entries, keys):
        if isinstance(keys, str):
            keys = [keys]
        for entry in entries:
            eid = (entry.get("id") or "").lower()
            finding = (entry.get("finding") or "").strip()
            if not finding:
                continue
            if any(k in eid for k in keys):
                return finding
        return None
    for target in targets[:1]:
        tmpf = tempfile.NamedTemporaryFile(mode="w", delete=False, suffix=".json")
        tmp_path = tmpf.name
        tmpf.close()
        r = run_cmd([exe, "--quiet", "--warnings", "off", "--openssl-timeout", "10", "--socket-timeout", "10", "--jsonfile", tmp_path, target], timeout=90, env=testssl_env)
        parsed = []
        try:
            with open(tmp_path) as f:
                raw = f.read().strip()
                if raw:
                    parsed = json.loads(raw)
        except (json.JSONDecodeError, FileNotFoundError, OSError):
            pass
        finally:
            Path(tmp_path).unlink(missing_ok=True)
        grade = "F"
        issuer = None
        ip_addr = None
        rdns = None
        expiry_date = None
        purchase_date = None
        cipher_suite = None
        is_trusted = True
        for entry in parsed:
            eid = entry.get("id", "")
            finding = entry.get("finding", "")
            if eid == "rating" and finding:
                grade = finding
            if "issuer" in eid.lower() and finding:
                issuer = finding
            if eid.lower() in {"ip", "targetip", "service_ip"} and finding:
                ip_addr = finding
            if "reverse" in eid.lower() and "dns" in eid.lower() and finding:
                rdns = finding

        expiry_date = _pick_first(parsed, ["notafter", "expiry", "expiration", "cert_notafter"])
        purchase_date = _pick_first(parsed, ["notbefore", "issued", "startdate", "cert_notbefore"])
        cipher_suite = _pick_first(parsed, ["cipher", "ciphersuite", "bestcipher"])

        trust_finding = _pick_first(parsed, ["trusted", "verify", "chain_of_trust", "cert_chain"])
        if trust_finding:
            trust_text = trust_finding.lower()
            is_trusted = not any(bad in trust_text for bad in ["not trusted", "failed", "invalid", "self-signed", "incomplete"])

        host = target.replace("https://", "").replace("http://", "").split("/")[0]
        results.append({
            "host": host,
            "ssl_grade": grade,
            "issuer": issuer,
            "ip": ip_addr,
            "rdns": rdns,
            "expiry_date": expiry_date,
            "purchase_date": purchase_date,
            "cipher_suite": cipher_suite,
            "is_trusted": is_trusted,
            "raw": r["stdout"][:2000],
        })
    return results


# ── Helpers ──────────────────────────────────────────────────────────────────

def mark_phase(scan, phase_field, progress):
    setattr(scan, phase_field, True)
    scan.progress = progress
    scan.save(update_fields=[phase_field, "progress"])


# ── Full Scan Orchestrator ───────────────────────────────────────────────────

def run_full_scan(scan):
    target = scan.target
    org_id = scan.org_id
    try:
        scan.status = "running"
        scan.progress = 2
        scan.save()

        # ── Phase 1: Subdomain Discovery ──────────────────────────────────────
        subdomains = run_subfinder(target)
        if not subdomains:
            subdomains = [target]

        for sub in subdomains:
            SubdomainResult.objects.get_or_create(
                scan=scan, domain=sub,
                defaults={"org_id": org_id, "status": "Active"},
            )
        mark_phase(scan, "subdomains_done", 15)

        # ── Phase 2: Live Host Probing (Python httpx) ─────────────────────────
        httpx_results = run_httpx(subdomains)
        live_urls = []
        for h in httpx_results:
            u = h.get("url", "")
            if u and h.get("status_code") and 200 <= h["status_code"] < 500:
                live_urls.append(u)
        if not live_urls:
            live_urls = [f"https://{d}" for d in subdomains[:3]]

        # ── Phase 3: Technology Detection (Wappalyzer + header analysis) ──────
        wappalyzer_results = run_wappalyzer(subdomains[:10])
        wapp_tech_map = {}
        for wr in wappalyzer_results:
            dom = wr.get("domain", "")
            if dom:
                wapp_tech_map[dom] = wr.get("technologies", [])
        header_techs = run_header_tech_analysis(subdomains[:10], httpx_results)

        # Merge all techs per host
        combined_tech_map = {}
        for data in httpx_results:
            url = data.get("url", "")
            host = urlparse(url).hostname or ""
            if not host:
                continue
            techs = set(data.get("tech", []) or [])
            if host in wapp_tech_map:
                techs.update(wapp_tech_map[host])
            if host in header_techs:
                techs.update(header_techs[host])
            combined_tech_map[host] = sorted(techs) if techs else []

        # Save endpoints
        for data in httpx_results:
            url = data.get("url", "")
            if not url:
                continue
            hn = urlparse(url).hostname or ""
            techs = combined_tech_map.get(hn, data.get("tech", []))
            EndpointResult.objects.get_or_create(
                scan=scan, http_url=url,
                defaults={
                    "subdomain_name": hn,
                    "http_status": data.get("status_code"),
                    "content_type": data.get("content_type"),
                    "content_length": data.get("content_length"),
                    "title": data.get("title", ""),
                    "is_alive": True,
                    "technologies": techs,
                    "org_id": org_id,
                },
            )
            SubdomainResult.objects.filter(scan=scan, domain=hn).update(
                title=data.get("title", ""),
                technologies=techs,
            )

        # Save technology results
        for host, techs in combined_tech_map.items():
            if techs:
                TechnologyResult.objects.get_or_create(
                    scan=scan, domain=host,
                    defaults={"technologies": techs, "org_id": org_id},
                )

        mark_phase(scan, "endpoints_done", 35)
        mark_phase(scan, "technologies_done", 40)

        hostnames = []
        for u in live_urls:
            try:
                hostnames.append(urlparse(u).hostname or u)
            except Exception:
                hostnames.append(u)

        # ── Phase 4: Port scanning ───────────────────────────────────────────
        vuln_count_map = {}

        scan.progress = 45
        scan.save(update_fields=["progress"])
        logger.info("Phase 4: port scanning targets=%s", hostnames[:3])
        try:
            nmap_results = run_nmap(hostnames[:3])
        except Exception as e:
            logger.exception("nmap phase failed: %s", e)
            nmap_results = []

        # Save ports
        saved_ports = 0
        for nmap_host in nmap_results:
            domain_name = nmap_host.get("hostname") or nmap_host.get("address", "")
            port_nums = [p["port"] for p in nmap_host.get("ports", [])]
            if port_nums:
                PortResult.objects.get_or_create(
                    scan=scan, domain=domain_name,
                    defaults={"ports": port_nums, "org_id": org_id},
                )
                saved_ports += 1
        if saved_ports == 0:
            PortResult.objects.get_or_create(
                scan=scan,
                domain=target,
                defaults={"ports": [], "org_id": org_id},
            )
        mark_phase(scan, "ports_done", 55)

        # ── Phase 5: Vulnerability scanning (tech-aware) ──────────────────────
        scan.progress = 60
        scan.save(update_fields=["progress"])
        # Collect all detected technologies across hosts for targeted scanning
        all_techs = set()
        for host, techs in combined_tech_map.items():
            all_techs.update(techs)
        nuclei_tags = techs_to_nuclei_tags(all_techs) if all_techs else None
        logger.info("Phase 5: vulnerability scanning targets=%s techs=%s tags=%s",
                     live_urls[:5], sorted(all_techs), nuclei_tags)
        try:
            nuclei_results = run_nuclei(live_urls[:5], tech_tags=nuclei_tags)
        except Exception as e:
            logger.exception("nuclei phase failed: %s", e)
            nuclei_results = []

        # Save vulnerabilities
        for nv in nuclei_results:
            target_url = nv.get("target", "")
            matched_host = nv.get("host") or urlparse(target_url).hostname or target
            severity = (nv.get("severity") or "info").upper()
            cve = nv.get("cve", "")
            cwe = nv.get("cwe", "")
            finding = nv.get("name", "")
            template_id = nv.get("template_id", "")
            vuln_id = f"CVE-{cve}" if cve else f"NUC-{template_id or 'unknown'}"
            VulnerabilityResult.objects.create(
                scan=scan,
                vulnerability_id=vuln_id,
                domain=target,
                subdomain=matched_host,
                severity=severity,
                cve=cve or "-",
                cwe=cwe or "-",
                finding=finding or "-",
                template_id=template_id or "",
                org_id=org_id,
            )
            if matched_host not in vuln_count_map:
                vuln_count_map[matched_host] = 0
            vuln_count_map[matched_host] += 1

        if not nuclei_results:
            VulnerabilityResult.objects.create(
                scan=scan,
                vulnerability_id="NUC-NO-FINDINGS",
                domain=target,
                subdomain=target,
                severity="INFO",
                cve="-",
                cwe="-",
                finding="Nuclei scan completed. No vulnerabilities were reported by the tool.",
                template_id="",
                org_id=org_id,
            )

        for subdomain, count in vuln_count_map.items():
            SubdomainResult.objects.filter(scan=scan, domain=subdomain).update(
                vulnerabilities_count=count
            )
        mark_phase(scan, "vulnerabilities_done", 75)

        # ── Phase 6: SSL scanning ─────────────────────────────────────────────
        scan.progress = 80
        scan.save(update_fields=["progress"])
        logger.info("Phase 6: SSL scanning targets=%s", hostnames[:1])
        try:
            ssl_results = run_testssl(hostnames[:1])
        except Exception as e:
            logger.exception("testssl phase failed: %s", e)
            ssl_results = []

        # Save SSL
        if not ssl_results:
            ssl_results = [{"host": target, "ssl_grade": "UNKNOWN", "issuer": "testssl.sh produced no parseable result"}]
        for ssl in ssl_results:
            host = ssl.get("host", "")
            SSLResult.objects.get_or_create(
                scan=scan, domain=host,
                defaults={
                    "ssl_grade": ssl.get("ssl_grade", "F"),
                    "issuer_name": ssl.get("issuer", ""),
                    "ip": ssl.get("ip") or "",
                    "rdns": ssl.get("rdns") or "",
                    "expiry_date": ssl.get("expiry_date") or "",
                    "purchase_date": ssl.get("purchase_date") or "",
                    "cipher_suite": ssl.get("cipher_suite") or "",
                    "is_trusted": ssl.get("is_trusted", True),
                    "org_id": org_id,
                },
            )
        mark_phase(scan, "ssl_done", 85)

        # ── Phase 7: Email security ───────────────────────────────────────────
        try:
            email_results = run_email_security(target)
        except Exception:
            email_results = {}

        # Save email security
        email_data = {k: v for k, v in email_results.items() if k != "domain"}
        EmailSecurityResult.objects.create(
            scan=scan, domain=target, org_id=org_id, **email_data,
        )
        mark_phase(scan, "email_done", 95)

        # ── Phase 8: Directory Scanning ──────────────────────────────────────
        try:
            dirs = run_directory_scan(live_urls[:5])
            for dr in dirs:
                DirectoryResult.objects.get_or_create(
                    scan=scan, url=dr.get("url", ""),
                    defaults={
                        "subdomain_name": urlparse(dr.get("url", "")).hostname or "",
                        "status": dr.get("status", 0),
                        "content_type": dr.get("content_type", ""),
                        "content_details": dr.get("content_length", ""),
                        "org_id": org_id,
                    },
                )
        except Exception:
            pass
        mark_phase(scan, "directories_done", 100)

        # ── Done ─────────────────────────────────────────────────────────────
        scan.progress = 100
        scan.status = "completed"
        scan.save(update_fields=["progress", "status"])

    except Exception as e:
        scan.status = "failed"
        scan.save(update_fields=["status"])
        logger.exception("Scan failed: %s", e)
