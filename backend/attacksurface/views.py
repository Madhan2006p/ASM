import threading

from rest_framework import permissions, status
from rest_framework.generics import ListCreateAPIView, ListAPIView, RetrieveAPIView
from rest_framework.response import Response
from rest_framework.views import APIView

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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get_org_id(self):
        return self.request.query_params.get("org_id", "1")

    def get_queryset(self):
        qs = self.model.objects.filter(org_id=self.get_org_id())
        scan_id = self.request.query_params.get("scan")
        if scan_id:
            qs = qs.filter(scan_id=scan_id)
        return qs


class SubdomainListView(AttackSurfaceBaseView):
    serializer_class = SubdomainResultSerializer
    model = SubdomainResult


class EndpointListView(AttackSurfaceBaseView):
    serializer_class = EndpointResultSerializer
    model = EndpointResult


class PortListView(AttackSurfaceBaseView):
    serializer_class = PortResultSerializer
    model = PortResult


class DirectoryListView(AttackSurfaceBaseView):
    serializer_class = DirectoryResultSerializer
    model = DirectoryResult


class TechnologyListView(AttackSurfaceBaseView):
    serializer_class = TechnologyResultSerializer
    model = TechnologyResult


class VulnerabilityListView(AttackSurfaceBaseView):
    serializer_class = VulnerabilityResultSerializer
    model = VulnerabilityResult


class SSLResultListView(AttackSurfaceBaseView):
    serializer_class = SSLResultSerializer
    model = SSLResult


class EmailSecurityListView(AttackSurfaceBaseView):
    serializer_class = EmailSecurityResultSerializer
    model = EmailSecurityResult


class ScanListView(ListAPIView):
    serializer_class = AttackSurfaceScanSerializer
    queryset = AttackSurfaceScan.objects.all().order_by("-created_at")
    authentication_classes = []
    permission_classes = [permissions.AllowAny]


class ScanTriggerView(APIView):
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        target = request.data.get("target", "").strip()
        org_id = request.data.get("org_id", "1")
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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        org_id = request.query_params.get("org_id", "1")
        qs = MonitoredDomain.objects.filter(org_id=org_id)
        return Response(MonitoredDomainSerializer(qs, many=True).data)

    def post(self, request):
        domain = request.data.get("domain", "").strip().lower()
        org_id = request.data.get("org_id", "1")
        if domain.startswith("http://") or domain.startswith("https://"):
            domain = domain.split("//", 1)[1].split("/", 1)[0]
        domain = domain.split(":", 1)[0].removeprefix("www.")
        if not domain:
            return Response({"error": "domain is required"}, status=400)

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
    authentication_classes = []
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        domain = request.data.get("domain", "").strip().lower()
        org_id = request.data.get("org_id", "1")
        if not domain:
            return Response({"error": "domain is required"}, status=400)
        scan = start_attack_surface_scan(domain, org_id)
        return Response({"scan_id": scan.id, "target": domain, "status": "pending"})


class ScanStatusView(RetrieveAPIView):
    queryset = AttackSurfaceScan.objects.all()
    serializer_class = AttackSurfaceScanSerializer
    authentication_classes = []
    permission_classes = [permissions.AllowAny]
    lookup_field = "id"
