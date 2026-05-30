from django.urls import path

<<<<<<< HEAD
from .views import CheckAuthView, LoginView, LogoutView, ProfileView, RegisterView
=======
from .views import (
    AdminCreateUserView,
    CheckAuthView,
    ListOrganizationUsersView,
    LoginView,
    LogoutView,
    OrganizationDetailView,
    OrganizationListView,
    OrganizationMembersView,
    ProfileView,
    RegisterView,
)
>>>>>>> latest

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("profile/", ProfileView.as_view(), name="profile"),
    path("check-auth/", CheckAuthView.as_view(), name="check-auth"),
<<<<<<< HEAD
=======
    # Organization management
    path("organizations/", OrganizationListView.as_view(), name="org-list"),
    path("organizations/<str:org_id>/", OrganizationDetailView.as_view(), name="org-detail"),
    path("organizations/<str:org_id>/members/", OrganizationMembersView.as_view(), name="org-members"),
    # Admin: user management
    path("admin/create-user/", AdminCreateUserView.as_view(), name="admin-create-user"),
    path("admin/organizations/<str:org_id>/users/", ListOrganizationUsersView.as_view(), name="admin-org-users"),
>>>>>>> latest
]
