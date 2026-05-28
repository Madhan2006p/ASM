from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import FuzzingQueue, FuzzingResult
from .serializers import FuzzingQueueSerializer, FuzzingResultSerializer
from .tasks import run_arjun

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

    def perform_create(self, serializer):
        queue = serializer.save()
        run_arjun.delay(queue.id)
