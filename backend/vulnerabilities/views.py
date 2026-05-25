from rest_framework import viewsets, permissions
from .models import Vulnerability
from .serializers import VulnerabilitySerializer

class VulnerabilityViewSet(viewsets.ModelViewSet):
    serializer_class = VulnerabilitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Vulnerability.objects.filter(target__user=self.request.user)
