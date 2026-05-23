from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import Scan, SSLResult, MonitorSchedule, DetectionResult
from .serializers import (
    ScanSerializer, SSLResultSerializer,
    MonitorScheduleSerializer, DetectionResultSerializer
)
from .tasks import (
    run_dirsearch, run_nuclei_vuln_scan, run_wappalyzer_scan, run_ssl_check,
    run_nmap_scan, run_httpx_tech, run_inql, run_gau, run_waybackurls,
    run_swagger, run_soap_wsdl, run_grpcurl, run_full_workflow,
    run_detection_scan, run_periodic_monitor
)
from fuzzing.tasks import run_arjun

SCAN_TASK_MAP = {
    'DIRSEARCH': run_dirsearch,
    'HTTPX_TECH': run_httpx_tech,
    'INQL': run_inql,
    'GAU': run_gau,
    'WAYBACKURLS': run_waybackurls,
    'SWAGGER': run_swagger,
    'SOAP_WSDL': run_soap_wsdl,
    'GRPCURL': run_grpcurl,
    'ARJUN': run_arjun,
    'NUCLEI': run_nuclei_vuln_scan,
    'NMAP': run_nmap_scan,
    'SSL_CHECK': run_ssl_check,
    'FULL_WORKFLOW': run_full_workflow,
}

class ScanViewSet(viewsets.ModelViewSet):
    serializer_class = ScanSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Scan.objects.filter(target__user=self.request.user)

    def perform_create(self, serializer):
        scan = serializer.save()
        task = SCAN_TASK_MAP.get(scan.scan_type)
        if task:
            task.delay(scan.id)

    @action(detail=False, methods=['post'])
    def detect(self, request):
        target_id = request.data.get('target')
        scan_types = request.data.get('scan_types', ['HTTPX_TECH', 'DIRSEARCH', 'NUCLEI', 'SSL_CHECK'])
        if not target_id:
            return Response({'error': 'target is required'}, status=status.HTTP_400_BAD_REQUEST)

        results = {}
        for st in scan_types:
            task = SCAN_TASK_MAP.get(st)
            if task:
                scan = Scan.objects.create(
                    target_id=target_id,
                    scan_type=st,
                    status='PENDING'
                )
                task.delay(scan.id)
                results[st] = {'scan_id': scan.id, 'status': 'queued'}
            else:
                results[st] = {'error': 'unknown scan type'}

        return Response(results, status=status.HTTP_202_ACCEPTED)

    @action(detail=False, methods=['get'])
    def detection_summary(self, request):
        from targets.models import Target
        targets = Target.objects.filter(user=request.user)
        summary = []
        for t in targets:
            scans = Scan.objects.filter(target=t).order_by('-started_at')
            vulns = t.vulnerabilities.all()
            techs = t.technologies.all()
            ssl = SSLResult.objects.filter(target=t)
            summary.append({
                'target': t.domain,
                'last_scan': scans.first().started_at if scans.exists() else None,
                'scan_count': scans.count(),
                'vulnerability_count': vulns.count(),
                'technology_count': techs.count(),
                'ssl_grade': ssl.first().grade if ssl.exists() else None,
            })
        return Response(summary)

class SSLResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = SSLResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return SSLResult.objects.filter(target__user=self.request.user)

class MonitorScheduleViewSet(viewsets.ModelViewSet):
    serializer_class = MonitorScheduleSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return MonitorSchedule.objects.filter(target__user=self.request.user)

    def perform_create(self, serializer):
        schedule = serializer.save()
        from django_celery_beat.models import PeriodicTask, IntervalSchedule, CrontabSchedule
        from datetime import timedelta

        freq_map = {
            'HOURLY': lambda: IntervalSchedule.objects.get_or_create(every=1, period=IntervalSchedule.HOURS)[0],
            'DAILY': lambda: IntervalSchedule.objects.get_or_create(every=1, period=IntervalSchedule.DAYS)[0],
            'WEEKLY': lambda: IntervalSchedule.objects.get_or_create(every=7, period=IntervalSchedule.DAYS)[0],
            'MONTHLY': lambda: IntervalSchedule.objects.get_or_create(every=30, period=IntervalSchedule.DAYS)[0],
        }
        interval = freq_map.get(schedule.frequency, freq_map['DAILY'])()

        PeriodicTask.objects.create(
            interval=interval,
            name=f'monitor_{schedule.id}_{schedule.name}',
            task='scans.tasks.run_periodic_monitor',
            args=f'[{schedule.id}]',
        )

class DetectionResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = DetectionResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return DetectionResult.objects.filter(target__user=self.request.user)

    @action(detail=True, methods=['post'])
    def acknowledge(self, request, pk=None):
        detection = self.get_object()
        detection.acknowledged = True
        detection.save()
        return Response({'status': 'acknowledged'})
