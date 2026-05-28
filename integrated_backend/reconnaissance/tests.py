from unittest.mock import patch

from rest_framework.test import APITestCase

from .models import DiscoveredDomain, ReconEndpoint, ToolOutput
from .services.email_security_scanner import parse_smtp_starttls
from .services.nmap_scanner import parse_nmap


class RunScanViewTests(APITestCase):
    def setUp(self):
        from django.contrib.auth.models import User
        self.user = User.objects.create_user(username="testuser", password="testpass123")
        self.client.force_authenticate(user=self.user)

    def test_run_scan_includes_cyber_team_tools(self):
        with (
            patch("reconnaissance.views.run_subfinder", return_value=subdomain_result("a.example.com", "b.example.com")),
            patch("reconnaissance.views.run_assetfinder", return_value=subdomain_result("b.example.com", "c.example.com")),
            patch("reconnaissance.views.run_findomain", return_value=subdomain_result("d.example.com")),
            patch("reconnaissance.views.run_gau", return_value=endpoint_result()),
            patch("reconnaissance.views.run_naabu", return_value=open_port_result()),
            patch("reconnaissance.views.run_email_security_scan", return_value=email_security_result()),
            patch(
                "reconnaissance.views.run_httpx",
                return_value={
                    "raw_output": "https://a.example.com\n",
                    "parsed_output": {
                        "total_live_hosts": 1,
                        "live_hosts": [{"url": "https://a.example.com"}],
                    },
                },
            ),
            patch(
                "reconnaissance.views.run_nmap",
                return_value={
                    "raw_output": "<nmaprun />",
                    "parsed_output": {
                        "total_hosts": 1,
                        "total_ports": 1,
                        "targets_scanned": ["a.example.com"],
                        "hosts": [{"address": "1.1.1.1", "hostname": "a.example.com", "ports": []}],
                        "ports": [{"host": "1.1.1.1", "port": "443", "state": "open"}],
                    },
                },
            ),
            patch(
                "reconnaissance.views.run_nuclei",
                return_value={
                    "raw_output": "{}",
                    "parsed_output": {
                        "total_vulnerabilities": 1,
                        "targets_scanned": ["https://a.example.com"],
                        "vulnerabilities": [
                            {
                                "template_id": "tech-detect",
                                "name": "Technology Detection",
                                "severity": "info",
                                "target": "https://a.example.com",
                            }
                        ],
                    },
                },
            ),
        ):
            response = self.client.post(
                "/api/recon/run-scan/",
                {"target": "https://Example.com/login"},
                format="json",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["target"], "example.com")
        self.assertIn("findomain", response.data)
        self.assertIn("email_security", response.data)
        self.assertEqual(response.data["public_assets"]["total_discovered_subdomains"], 4)

        tool_names = set(ToolOutput.objects.values_list("tool_name", flat=True))
        self.assertEqual(
            tool_names,
            {
                "subfinder",
                "assetfinder",
                "findomain",
                "gau",
                "naabu",
                "httpx",
                "nmap",
                "nuclei",
                "email_security",
            },
        )
        self.assertEqual(DiscoveredDomain.objects.count(), 4)
        self.assertEqual(ReconEndpoint.objects.count(), 1)


class NmapParserTests(APITestCase):
    def test_parse_nmap_extracts_hosts_ports_and_scripts(self):
        parsed = parse_nmap(
            """
            <nmaprun>
              <host>
                <status state="up" />
                <address addr="203.0.113.10" addrtype="ipv4" />
                <hostnames>
                  <hostname name="mail.example.com" />
                </hostnames>
                <os>
                  <osmatch name="Linux 5.x" />
                </os>
                <ports>
                  <port protocol="tcp" portid="25">
                    <state state="open" />
                    <service name="smtp" product="Postfix" version="3.6" />
                    <script id="smtp-open-relay" output="Server doesn't seem to be an open relay" />
                  </port>
                </ports>
              </host>
            </nmaprun>
            """
        )

        self.assertEqual(len(parsed["hosts"]), 1)
        self.assertEqual(len(parsed["ports"]), 1)
        self.assertEqual(parsed["hosts"][0]["hostname"], "mail.example.com")
        self.assertEqual(parsed["hosts"][0]["os_matches"], ["Linux 5.x"])
        self.assertEqual(parsed["ports"][0]["service"], "smtp")
        self.assertEqual(parsed["ports"][0]["scripts"][0]["id"], "smtp-open-relay")


class EmailSecurityParserTests(APITestCase):
    def test_parse_smtp_starttls_extracts_certificate_metadata(self):
        parsed = parse_smtp_starttls(
            """
            subject=CN = mail.example.com
            issuer=C = US, O = Example CA
            Protocol  : TLSv1.3
            Cipher    : TLS_AES_256_GCM_SHA384
            start date: May 20 00:00:00 2026 GMT
            expire date: Jun 20 23:59:59 2027 GMT
            Verify return code: 0 (ok)
            """
        )

        self.assertEqual(parsed["subject"], "CN = mail.example.com")
        self.assertEqual(parsed["issuer"], "C = US, O = Example CA")
        self.assertEqual(parsed["protocol"], "TLSv1.3")
        self.assertEqual(parsed["cipher"], "TLS_AES_256_GCM_SHA384")
        self.assertEqual(parsed["verify_return_code"], "0 (ok)")


def subdomain_result(*subdomains):
    return {
        "raw_output": "\n".join(subdomains),
        "parsed_output": {
            "total_subdomains": len(subdomains),
            "subdomains": [{"subdomain": value} for value in subdomains],
        },
    }


def endpoint_result(*urls):
    return {
        "raw_output": "\n".join(urls),
        "parsed_output": {
            "total_endpoints": len(urls),
            "endpoints": [{"url": value} for value in urls],
        },
    }


def open_port_result(*ports):
    return {
        "raw_output": "\n".join(ports),
        "parsed_output": {
            "total_open_ports": len(ports),
            "open_ports": [],
        },
    }


def email_security_result():
    return {
        "domain": "example.com",
        "dns_backend": "dnspython",
        "root_txt": ['"v=spf1 include:_spf.example.com ~all"'],
        "spf": ['"v=spf1 include:_spf.example.com ~all"'],
        "dmarc": ['"v=DMARC1; p=reject"'],
        "mx": ["10 mail.example.com."],
        "dkim_selector1": [],
        "dkim_default": [],
        "smtp_hosts": ["mail.example.com"],
        "smtp_port_scan": {"total_hosts": 1, "total_ports": 1, "hosts": [], "ports": []},
        "smtp_open_relay": {"total_hosts": 1, "total_ports": 1, "hosts": [], "ports": []},
        "smtp_starttls": {"host": "mail.example.com", "protocol": "TLSv1.3"},
    }
