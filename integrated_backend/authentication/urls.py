from django.urls import path

from .views import (
    CheckAuthView,
    LoginView,
    LogoutView,
    OrganizationDetailView,
    OrganizationListView,
    OrganizationMembersView,
    ProfileView,
    RegisterView,
)

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("check-auth/", CheckAuthView.as_view(), name="check-auth"),
    # Organization management
    path("organizations/", OrganizationListView.as_view(), name="org-list"),
    path("organizations/<str:org_id>/", OrganizationDetailView.as_view(), name="org-detail"),
    path("organizations/<str:org_id>/members/", OrganizationMembersView.as_view(), name="org-members"),
]
