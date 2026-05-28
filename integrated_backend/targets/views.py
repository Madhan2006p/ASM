from rest_framework import viewsets, permissions

from authentication.permissions import (
    HasModulePermission,
    IsAuthenticatedAndOrgMember,
    get_user_org_id,
)

from .models import Target, Endpoint
from .serializers import TargetSerializer, EndpointSerializer



class TargetViewSet(viewsets.ModelViewSet):
    serializer_class = TargetSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember, HasModulePermission]
    required_module = "trigger_scan"

    def get_queryset(self):
        org_id = get_user_org_id(self.request)
        return Target.objects.select_related('user').filter(
            user=self.request.user,
            user__memberships__organization__org_id=org_id,
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class EndpointViewSet(viewsets.ModelViewSet):
    serializer_class = EndpointSerializer
    permission_classes = [permissions.IsAuthenticated, IsAuthenticatedAndOrgMember, HasModulePermission]
    required_module = "endpoints"

    def get_queryset(self):
        org_id = get_user_org_id(self.request)
        return Endpoint.objects.select_related('target').filter(
            target__user=self.request.user,
            target__user__memberships__organization__org_id=org_id,
        )
