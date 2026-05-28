from rest_framework import viewsets, permissions
from .models import Target, Endpoint
from .serializers import TargetSerializer, EndpointSerializer

class TargetViewSet(viewsets.ModelViewSet):
    serializer_class = TargetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Target.objects.select_related('user').filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class EndpointViewSet(viewsets.ModelViewSet):
    serializer_class = EndpointSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Endpoint.objects.select_related('target').filter(target__user=self.request.user)
