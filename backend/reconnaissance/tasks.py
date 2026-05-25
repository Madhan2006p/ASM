from celery import shared_task
from concurrent.futures import ThreadPoolExecutor

from .models import ReconScan, ToolOutput, DiscoveredDomain, ReconEndpoint
from .services.api_inspector import detect_api_technology, test_http_methods, collect_api_urls
from .services.nmap_scanner import run_nmap
from .services.nuclei_scanner import run_nuclei
from .services.subfinder_scanner import run_subfinder
from .services.gau_scanner import run_gau


@shared_task(bind=True)
def run_scheduled_recon_scan(self, target="kongu.ac.in"):
    scan = ReconScan.objects.create(target=target, status="running", progress=0)

    executor = ThreadPoolExecutor(max_workers=4)

    nmap_future = executor.submit(run_nmap, target)
    nuclei_future = executor.submit(run_nuclei, target)
    subfinder_future = executor.submit(run_subfinder, target)
    gau_future = executor.submit(run_gau, target)

    try:
        nmap_result = nmap_future.result()
    except Exception:
        nmap_result = {"raw_output": "", "parsed_output": {"total_ports": 0, "ports": []}}

    try:
        nuclei_result = nuclei_future.result()
    except Exception:
        nuclei_result = {"raw_output": "", "parsed_output": {"total_vulnerabilities": 0, "vulnerabilities": []}}

    try:
        subfinder_result = subfinder_future.result()
    except Exception:
        subfinder_result = {"raw_output": "", "parsed_output": {"total_subdomains": 0, "subdomains": []}}

    try:
        gau_result = gau_future.result()
    except Exception:
        gau_result = {"raw_output": "", "parsed_output": {"total_endpoints": 0, "endpoints": []}}

    executor.shutdown(wait=True)

    ToolOutput.objects.create(scan=scan, tool_name="nmap", raw_output=nmap_result["raw_output"], parsed_output=nmap_result["parsed_output"])
    ToolOutput.objects.create(scan=scan, tool_name="nuclei", raw_output=nuclei_result["raw_output"], parsed_output=nuclei_result["parsed_output"])
    ToolOutput.objects.create(scan=scan, tool_name="subfinder", raw_output=subfinder_result["raw_output"], parsed_output=subfinder_result["parsed_output"])
    ToolOutput.objects.create(scan=scan, tool_name="gau", raw_output=gau_result["raw_output"], parsed_output=gau_result["parsed_output"])

    for item in subfinder_result["parsed_output"].get("subdomains", []):
        subdomain = item["subdomain"]
        if not DiscoveredDomain.objects.filter(scan=scan, subdomain=subdomain).exists():
            DiscoveredDomain.objects.create(
                scan=scan, root_domain=target, subdomain=subdomain, source="scheduled-subfinder"
            )

    for item in gau_result["parsed_output"].get("endpoints", []):
        url = item["url"]
        if not ReconEndpoint.objects.filter(scan=scan, url=url).exists():
            ReconEndpoint.objects.create(
                scan=scan, url=url, source="scheduled-gau", method="GET", has_params=("?" in url)
            )

    for item in nuclei_result["parsed_output"].get("vulnerabilities", []):
        url = item.get("target")
        if url and url.startswith("http"):
            if not ReconEndpoint.objects.filter(scan=scan, url=url).exists():
                ReconEndpoint.objects.create(
                    scan=scan, url=url, source="scheduled-nuclei", method="GET", has_params=("?" in url)
                )

    scan.progress = 100
    scan.status = "completed"
    scan.save()

    return {"target": target, "status": "completed", "scan_id": scan.id}


@shared_task(bind=True)
def run_api_inspection(self, scan_id):
    scan = ReconScan.objects.get(id=scan_id)
    scan.status = "running"
    scan.progress = 10
    scan.save()

    result = detect_api_technology(scan.target)

    ToolOutput.objects.create(
        scan=scan, tool_name="api_inspector",
        raw_output="", parsed_output=result,
    )

    scan.progress = 100
    scan.status = "completed"
    scan.save()
    return result


@shared_task(bind=True)
def run_method_scan(self, scan_id):
    scan = ReconScan.objects.get(id=scan_id)
    scan.status = "running"
    scan.progress = 10
    scan.save()

    targets = [scan.target]
    tool_outputs = ToolOutput.objects.filter(scan=scan, tool_name="api_inspector")
    if tool_outputs.exists():
        data = tool_outputs.first().parsed_output
        if data.get("swagger_paths"):
            base = data["base_url"]
            for sp in data["swagger_paths"]:
                targets.append(f"{base}{sp['path']}")

    all_results = []
    for i, t in enumerate(targets):
        result = test_http_methods(t)
        all_results.append(result)
        scan.progress = 10 + int((i + 1) / len(targets) * 80)
        scan.save(update_fields=["progress"])

    ToolOutput.objects.create(
        scan=scan, tool_name="method_scanner",
        raw_output="", parsed_output={"targets": all_results},
    )

    scan.progress = 100
    scan.status = "completed"
    scan.save()
    return {"target": scan.target, "targets_scanned": len(targets)}


@shared_task(bind=True)
def run_api_url_collection(self, scan_id):
    scan = ReconScan.objects.get(id=scan_id)
    scan.status = "running"
    scan.progress = 10
    scan.save()

    result = collect_api_urls(scan.target)

    ToolOutput.objects.create(
        scan=scan, tool_name="api_url_collector",
        raw_output="", parsed_output=result,
    )

    scan.progress = 100
    scan.status = "completed"
    scan.save()
    return result
