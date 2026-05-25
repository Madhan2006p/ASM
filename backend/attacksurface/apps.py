import logging

from django.apps import AppConfig

logger = logging.getLogger(__name__)


class AttackSurfaceConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'attacksurface'

    def ready(self):
        from .models import AttackSurfaceScan
        stuck = AttackSurfaceScan.objects.filter(status="running")
        count = stuck.count()
        if count:
            stuck.update(status="failed")
            logger.warning("Marked %d orphaned running scans as failed (server restarted)", count)
