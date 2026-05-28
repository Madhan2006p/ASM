from django.http import JsonResponse
from django.urls import get_resolver

def api_root(request):
    urls = [
        ("admin/", "Django Admin"),
        ("api/auth/token/", "JWT Token Obtain"),
        ("api/auth/token/refresh/", "JWT Token Refresh"),
        ("api/auth/token/verify/", "JWT Token Verify"),
        ("api/auth/", "Authentication (register, profile)"),
        ("api/targets/", "Targets Management"),
        ("api/scans/", "Scans Management"),
        ("api/fuzzing/", "Fuzzing Results"),
        ("api/vulnerabilities/", "Vulnerabilities"),
        ("api/apk/", "APK Scanner"),
        ("api/recon/", "Reconnaissance (subdomains, DNS, email)"),
        ("api/recon/scans/", "Recon Scans List"),
        ("api/recon/domains/", "Discovered Domains"),
        ("api/recon/endpoints/", "Recon Endpoints"),
        ("api/attacksurface/", "Attack Surface Management"),
        ("api/attacksurface/subdomains/", "Attack Surface Subdomains"),
        ("api/attacksurface/endpoints/", "Attack Surface Endpoints"),
        ("api/attacksurface/open-ports/", "Open Ports"),
        ("api/attacksurface/directories/", "Directories"),
        ("api/attacksurface/vulnerabilities/", "Attack Surface Vulnerabilities"),
        ("api/attacksurface/ssl-certificates/", "SSL Certificates"),
        ("api/attacksurface/email-security/", "Email Security"),
        ("api/attacksurface/scans/", "Attack Surface Scans"),
        ("api/attacksurface/domains/", "Monitored Domains"),
    ]
    endpoints = [{"path": p, "description": d} for p, d in urls]
    return JsonResponse({
        "service": "ASM Attack Surface Management API",
        "version": "1.0",
        "endpoints": endpoints,
    })
