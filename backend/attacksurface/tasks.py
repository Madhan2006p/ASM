from celery import shared_task
from django.utils import timezone

from .models import AttackSurfaceScan, MonitoredDomain
from .services import run_full_scan


def _same_minute(a, b):
    return a.hour == b.hour and a.minute == b.minute


def _already_scanned_today(value, today):
    return value is not None and timezone.localtime(value).date() == today


@shared_task
def run_scheduled_domain_scans():
    now = timezone.localtime()
    today = now.date()
    started = []

    for item in MonitoredDomain.objects.all():
        should_run = False
        slot = None

        if item.morning_enabled and _same_minute(item.morning_time, now.time()):
            if not _already_scanned_today(item.last_morning_scan_at, today):
                should_run = True
                slot = "morning"

        if item.night_enabled and _same_minute(item.night_time, now.time()):
            if not _already_scanned_today(item.last_night_scan_at, today):
                should_run = True
                slot = "night"

        if not should_run:
            continue

        scan = AttackSurfaceScan.objects.create(
            target=item.domain,
            org_id=item.org_id,
            status="pending",
        )
        run_full_scan(scan)
        if slot == "morning":
            item.last_morning_scan_at = timezone.now()
        elif slot == "night":
            item.last_night_scan_at = timezone.now()
        item.save(update_fields=["last_morning_scan_at", "last_night_scan_at", "updated_at"])
        started.append({"domain": item.domain, "scan_id": scan.id, "slot": slot})

    return {"started": started}
