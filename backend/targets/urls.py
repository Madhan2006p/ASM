from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TargetViewSet, EndpointViewSet

router = DefaultRouter()
router.register(r'', TargetViewSet, basename='target')
router.register(r'endpoints', EndpointViewSet, basename='endpoint')

urlpatterns = [
    path('', include(router.urls)),
]
