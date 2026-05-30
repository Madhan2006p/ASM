from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
<<<<<<< HEAD
=======

from authentication.permissions import (
    HasModulePermission,
    IsAuthenticatedAndOrgMember,
    get_user_org_id,
)

>>>>>>> latest
from .models import FuzzingQueue, FuzzingResult
from .serializers import FuzzingQueueSerializer, FuzzingResultSerializer
from .tasks import run_arjun

<<<<<<< HEAD
class FuzzingResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FuzzingResultSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FuzzingResult.objects.select_related('endpoint__target').filter(endpoint__target__user=self.request.user)

class FuzzingQueueViewSet(viewsets.ModelViewSet):
    serializer_class = FuzzingQueueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return FuzzingQueue.objects.select_related('endpoint__target').filter(endpoint__target__user=self.request.user)
=======


class FuzzingResultViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = FuzzingResultSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember, HasModulePermission]
    required_module = "fuzzing"

    def get_queryset(self):
        org_id = get_user_org_id(self.request)
        return FuzzingResult.objects.select_related('endpoint__target').filter(
            endpoint__target__user=self.request.user,
            endpoint__target__user__memberships__organization__org_id=org_id,
        )


class FuzzingQueueViewSet(viewsets.ModelViewSet):
    serializer_class = FuzzingQueueSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember, HasModulePermission]
    required_module = "fuzzing"

    def get_queryset(self):
        org_id = get_user_org_id(self.request)
        return FuzzingQueue.objects.select_related('endpoint__target').filter(
            endpoint__target__user=self.request.user,
            endpoint__target__user__memberships__organization__org_id=org_id,
        )
>>>>>>> latest

    def perform_create(self, serializer):
        queue = serializer.save()
        run_arjun.delay(queue.id)
