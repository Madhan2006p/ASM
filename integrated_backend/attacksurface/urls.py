from django.urls import path

from .views import (
    DirectoryListView,
    EmailSecurityListView,
    EndpointListView,
    PortListView,
    SSLResultListView,
    ScanListView,
    ScanStatusView,
    ScanTriggerView,
    SubdomainListView,
    TechnologyListView,
    VulnerabilityListView,
)

urlpatterns = [
    path("subdomains/", SubdomainListView.as_view(), name="attack-surface-subdomains"),
    path("endpoints/", EndpointListView.as_view(), name="attack-surface-endpoints"),
    path("open-ports/", PortListView.as_view(), name="attack-surface-ports"),
    path("directories/", DirectoryListView.as_view(), name="attack-surface-directories"),
    path("technologies/", TechnologyListView.as_view(), name="attack-surface-technologies"),
    path("vulnerabilities/", VulnerabilityListView.as_view(), name="attack-surface-vulnerabilities"),
    path("ssl-certificates/", SSLResultListView.as_view(), name="attack-surface-ssl"),
    path("email-security/", EmailSecurityListView.as_view(), name="attack-surface-email"),
    path("scans/", ScanListView.as_view(), name="attack-surface-scans"),
    path("scan/", ScanTriggerView.as_view(), name="attack-surface-scan-trigger"),
    path("scan/<int:id>/", ScanStatusView.as_view(), name="attack-surface-scan-status"),
]
