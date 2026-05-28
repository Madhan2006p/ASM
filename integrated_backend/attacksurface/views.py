import threading

from rest_framework import permissions, status
from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

from authentication.permissions import (
    IsAuthenticatedAndOrgMember,
    get_user_org_id,
    get_user_org_id_from_data,
    user_has_module_permission,
)

from .models import (
    AttackSurfaceScan,
    DirectoryResult,
    EmailSecurityResult,
    EndpointResult,
    MonitoredDomain,
    PortResult,
    SSLResult,
    SubdomainResult,
    TechnologyResult,
    VulnerabilityResult,
)
from .serializers import (
    AttackSurfaceScanSerializer,
    DirectoryResultSerializer,
    EmailSecurityResultSerializer,
    EndpointResultSerializer,
    MonitoredDomainSerializer,
    PortResultSerializer,
    SSLResultSerializer,
    SubdomainResultSerializer,
    TechnologyResultSerializer,
    VulnerabilityResultSerializer,
)
from .services import run_full_scan



class AttackSurfaceBaseView(ListAPIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]
    required_module = None  # Set by subclasses

    def get_org_id(self):
        return get_user_org_id(self.request)

    def get_queryset(self):
        # Check module permission
        if self.required_module and not user_has_module_permission(
            self.request.user, self.required_module
        ):
            return self.model.objects.none()
        qs = self.model.objects.filter(org_id=self.get_org_id())
        scan_id = self.request.query_params.get("scan")
        if scan_id:
            qs = qs.filter(scan_id=scan_id)
        return qs


class SubdomainListView(AttackSurfaceBaseView):
    serializer_class = SubdomainResultSerializer
    model = SubdomainResult
    required_module = "subdomains"


class EndpointListView(AttackSurfaceBaseView):
    serializer_class = EndpointResultSerializer
    model = EndpointResult
    required_module = "endpoints"


class PortListView(AttackSurfaceBaseView):
    serializer_class = PortResultSerializer
    model = PortResult
    required_module = "open_ports"


class DirectoryListView(AttackSurfaceBaseView):
    serializer_class = DirectoryResultSerializer
    model = DirectoryResult
    required_module = "directories"


class TechnologyListView(AttackSurfaceBaseView):
    serializer_class = TechnologyResultSerializer
    model = TechnologyResult
    required_module = "technologies"


class VulnerabilityListView(AttackSurfaceBaseView):
    serializer_class = VulnerabilityResultSerializer
    model = VulnerabilityResult
    required_module = "vulnerabilities"


class SSLResultListView(AttackSurfaceBaseView):
    serializer_class = SSLResultSerializer
    model = SSLResult
    required_module = "ssl_certificates"


class EmailSecurityListView(AttackSurfaceBaseView):
    serializer_class = EmailSecurityResultSerializer
    model = EmailSecurityResult
    required_module = "email_security"


class ScanListView(ListAPIView):
    serializer_class = AttackSurfaceScanSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]
    required_module = "scan_history"

    def get_queryset(self):
        if not user_has_module_permission(self.request.user, "scan_history"):
            return AttackSurfaceScan.objects.none()
        org_id = get_user_org_id(self.request)
        return AttackSurfaceScan.objects.filter(org_id=org_id).order_by("-created_at")


class ScanTriggerView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def post(self, request):
        import re
        if not user_has_module_permission(request.user, "trigger_scan"):
            return Response({"error": "Permission denied"}, status=403)

        target = request.data.get("target", "").strip().lower()
        # Normalize: strip protocol, path, port, www
        target = re.sub(r'^https?://', '', target)
        target = target.split('/')[0].split(':')[0]
        target = re.sub(r'^www\.', '', target)
        org_id = get_user_org_id_from_data(request)
        if not target:
            return Response({"error": "target is required"}, status=400)

        scan = AttackSurfaceScan.objects.create(
            target=target, org_id=org_id, status="pending"
        )

        thread = threading.Thread(target=run_full_scan, args=(scan,), daemon=True)
        thread.start()

        return Response(
            {"scan_id": scan.id, "target": target, "status": "pending"},
            status=status.HTTP_201_CREATED,
        )


def start_attack_surface_scan(target, org_id="1"):
    scan = AttackSurfaceScan.objects.create(target=target, org_id=org_id, status="pending")
    thread = threading.Thread(target=run_full_scan, args=(scan,), daemon=True)
    thread.start()
    return scan


class MonitoredDomainListView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def get(self, request):
        if not user_has_module_permission(request.user, "manage_domains"):
            return Response({"error": "Permission denied"}, status=403)
        org_id = get_user_org_id(request)
        qs = MonitoredDomain.objects.filter(org_id=org_id)
        return Response(MonitoredDomainSerializer(qs, many=True).data)

    def post(self, request):
        if not user_has_module_permission(request.user, "manage_domains"):
            return Response({"error": "Permission denied"}, status=403)

        import re
        domain = request.data.get("domain", "").strip().lower()
        domain = re.sub(r'^https?://', '', domain)
        domain = domain.split('/')[0].split(':')[0]
        domain = re.sub(r'^www\.', '', domain)
        if not domain:
            return Response({"error": "domain is required"}, status=400)

        org_id = get_user_org_id_from_data(request)

        defaults = {
            "morning_time": request.data.get("morning_time") or "09:00",
            "night_time": request.data.get("night_time") or "21:00",
            "morning_enabled": request.data.get("morning_enabled", True),
            "night_enabled": request.data.get("night_enabled", True),
            "auto_scan_on_add": request.data.get("auto_scan_on_add", True),
        }
        monitored, created = MonitoredDomain.objects.update_or_create(
            domain=domain,
            org_id=org_id,
            defaults=defaults,
        )

        scan = None
        if request.data.get("scan_now", defaults["auto_scan_on_add"]):
            scan = start_attack_surface_scan(domain, org_id)

        data = MonitoredDomainSerializer(monitored).data
        if scan:
            data["scan_id"] = scan.id
        data["created"] = created
        return Response(data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class DomainQuickScanView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def post(self, request):
        if not user_has_module_permission(request.user, "trigger_scan"):
            return Response({"error": "Permission denied"}, status=403)

        import re
        domain = request.data.get("domain", "").strip().lower()
        domain = re.sub(r'^https?://', '', domain)
        domain = domain.split('/')[0].split(':')[0]
        domain = re.sub(r'^www\.', '', domain)
        org_id = get_user_org_id_from_data(request)
        if not domain:
            return Response({"error": "domain is required"}, status=400)
        scan = start_attack_surface_scan(domain, org_id)
        return Response({"scan_id": scan.id, "target": domain, "status": "pending"})


class ScanStatusView(RetrieveAPIView):
    queryset = AttackSurfaceScan.objects.all()
    serializer_class = AttackSurfaceScanSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]
    lookup_field = "id"

    def get_queryset(self):
        org_id = get_user_org_id(self.request)
        return AttackSurfaceScan.objects.filter(org_id=org_id)


class ScanHistoryView(ListAPIView):
    serializer_class = AttackSurfaceScanSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def get_queryset(self):
        if not user_has_module_permission(self.request.user, "scan_history"):
            return AttackSurfaceScan.objects.none()
        org_id = get_user_org_id(self.request)
        return AttackSurfaceScan.objects.filter(org_id=org_id).order_by("-created_at")


class ClearDatabaseView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def delete(self, request):
        org_id = get_user_org_id(request)
        counts = {}
        models_in_order = [
            ("vulnerabilities", VulnerabilityResult),
            ("directories", DirectoryResult),
            ("email_security", EmailSecurityResult),
            ("technologies", TechnologyResult),
            ("ports", PortResult),
            ("endpoints", EndpointResult),
            ("ssl_certificates", SSLResult),
            ("subdomains", SubdomainResult),
            ("scans", AttackSurfaceScan),
        ]
        for name, model in models_in_order:
            c = model.objects.filter(org_id=org_id).count()
            model.objects.filter(org_id=org_id).delete()
            counts[name] = c
        return Response({"deleted": counts, "message": "Scan data cleared for organization"})


class ToolsHealthView(APIView):
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember]

    def get(self, request):
        import os
        import sys
        import shutil
        import subprocess
        from django.conf import settings
        from rest_framework.response import Response

        def check_tool_health(tool_name, tool_path, test_args=["--help"]):
            if isinstance(tool_path, list):
                cmd = list(tool_path)
                executable = tool_path[0]
            else:
                cmd = [tool_path]
                executable = tool_path

            # If absolute path doesn't exist, try resolving in system PATH
            resolved_path = shutil.which(executable) or executable
            if not os.path.exists(resolved_path) and not shutil.which(executable):
                # Try with .exe on Windows
                if os.name == 'nt' and not executable.endswith('.exe'):
                    resolved_path_exe = shutil.which(executable + '.exe') or (executable + '.exe')
                    if os.path.exists(resolved_path_exe) or shutil.which(executable + '.exe'):
                        resolved_path = resolved_path_exe
                        if isinstance(tool_path, list):
                            cmd[0] = resolved_path
                        else:
                            cmd = [resolved_path]

            # Final check of file existence or PATH resolution
            if not os.path.exists(resolved_path) and not shutil.which(executable):
                return {
                    "status": "MISSING",
                    "path": resolved_path if isinstance(tool_path, str) else " ".join(tool_path),
                    "version": None,
                    "error": "Binary or script not found in configured path or system PATH"
                }

            # Run validation test (suppress window popup on Windows)
            try:
                test_cmd = cmd + test_args
                startupinfo = None
                if os.name == 'nt':
                    startupinfo = subprocess.STARTUPINFO()
                    startupinfo.dwFlags |= subprocess.STARTF_USESHOWWINDOW

                r = subprocess.run(test_cmd, capture_output=True, text=True, timeout=5, startupinfo=startupinfo)
                output = (r.stdout or r.stderr or "").strip()
                version = "Available"
                
                # Try parsing version from first few lines of output
                lines = [line.strip() for line in output.splitlines() if line.strip()]
                for line in lines[:3]:
                    if any(x in line.lower() for x in ["version", "v0.", "v1.", "v2.", "v3.", "v4.", "v5.", "v6."]):
                        version = line
                        break
                if version == "Available" and lines:
                    version = lines[0][:60]

                return {
                    "status": "AVAILABLE",
                    "path": resolved_path if isinstance(tool_path, str) else " ".join(tool_path),
                    "version": version,
                    "error": None
                }
            except Exception as e:
                return {
                    "status": "ERROR",
                    "path": resolved_path if isinstance(tool_path, str) else " ".join(tool_path),
                    "version": None,
                    "error": str(e)
                }

        # Check Wappalyzer Python Module
        try:
            import Wappalyzer
            wappalyzer_health = {
                "status": "AVAILABLE",
                "path": "Python Packages (Wappalyzer)",
                "version": "python-Wappalyzer (Latest)",
                "error": None
            }
        except ImportError:
            wappalyzer_health = {
                "status": "MISSING",
                "path": "python-Wappalyzer",
                "version": None,
                "error": "python-Wappalyzer library not installed in this environment"
            }

        # Master mapping of tools to check
        tools_list = [
            ("subfinder", getattr(settings, "SUBFINDER_PATH", "subfinder"), ["-version"]),
            ("assetfinder", getattr(settings, "ASSETFINDER_PATH", "assetfinder"), ["-h"]),
            ("naabu", getattr(settings, "NAABU_PATH", "naabu"), ["-version"]),
            ("httpx", getattr(settings, "HTTPX_PATH", "httpx"), ["-version"]),
            ("nmap", getattr(settings, "NMAP_PATH", "nmap"), ["-V"]),
            ("nuclei", getattr(settings, "NUCLEI_PATH", "nuclei"), ["-version"]),
            ("testssl.sh", getattr(settings, "TESTSSL_PATH", "testssl.sh"), ["--help"]),
            ("dirsearch", getattr(settings, "DIRSEARCH_PATH", "dirsearch"), ["--version"]),
            ("arjun", getattr(settings, "ARJUN_PATH", "arjun"), ["--help"]),
            ("inql", getattr(settings, "INQL_PATH", "inql"), ["--help"]),
            ("gau", getattr(settings, "GAU_PATH", "gau"), ["--version"]),
            ("waybackurls", getattr(settings, "WAYBACKURLS_PATH", "waybackurls"), ["-h"]),
            ("grpcurl", getattr(settings, "GRPCURL_PATH", "grpcurl"), ["-help"]),
        ]

        results = []

        # 1. Add Wappalyzer
        results.append({
            "key": "Wappalyzer",
            "name": "Wappalyzer",
            "category": "Technology Detection",
            "estimate": "10 seconds",
            **wappalyzer_health
        })

        # 2. Add others
        friendly_names = {
            "subfinder": ("Subfinder", "Subdomain Discovery", "10 seconds"),
            "assetfinder": ("Assetfinder", "Subdomain Passive Mining", "5 seconds"),
            "naabu": ("Naabu", "Port Scanning", "15 seconds"),
            "httpx": ("Httpx", "Live Host Detection", "12 seconds"),
            "nmap": ("Nmap Scanner", "Network Service Discovery", "30 seconds"),
            "nuclei": ("Nuclei Templates", "Active Vulnerability Scan", "45 seconds"),
            "testssl.sh": ("TestSSL.sh", "SSL/TLS Security Audit", "60 seconds"),
            "dirsearch": ("Dirsearch", "Web Directory Brute-force", "40 seconds"),
            "arjun": ("Arjun Finder", "HTTP Parameter Discovery", "20 seconds"),
            "inql": ("InQL GraphQL Auditor", "GraphQL Security Analysis", "25 seconds"),
            "gau": ("GAU (GetAllUrls)", "Historical Endpoint Scraping", "15 seconds"),
            "waybackurls": ("Waybackurls", "Wayback Archive Crawling", "12 seconds"),
            "grpcurl": ("gRPCurl Lister", "gRPC Service Introspection", "15 seconds"),
        }

        for key, path, test_args in tools_list:
            health = check_tool_health(key, path, test_args)
            name, category, estimate = friendly_names.get(key, (key.capitalize(), "General Scanning", "20 seconds"))
            results.append({
                "key": key,
                "name": name,
                "category": category,
                "estimate": estimate,
                **health
            })

        from django.db import connection
        db_vendor = connection.vendor
        if db_vendor == 'postgresql':
            db_used = "PostgreSQL"
            db_status = "CONNECTED"
        else:
            db_used = "SQLite"
            db_status = "CONNECTED (Fallback)"

        return Response({
            "database_used": db_used,
            "database_status": db_status,
            "database_vendor": db_vendor,
            "tools": results
        })
