from django.conf import settings
from django.contrib.auth.models import User
from django.db import models


class Organization(models.Model):
    name = models.CharField(max_length=255)
    org_id = models.CharField(max_length=50, unique=True, default="1")
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    allowed_domains = models.TextField(
        blank=True,
        help_text="Enter domains separated by commas (e.g., example.com,test.org)",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class OrganizationMembership(models.Model):
    ROLE_CHOICES = [
        ("admin", "Admin"),
        ("member", "Member"),
        ("viewer", "Viewer"),
    ]

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="memberships"
    )
    organization = models.ForeignKey(
        Organization, on_delete=models.CASCADE, related_name="memberships"
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="member")
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Organization memberships"
        unique_together = ("user", "organization")
        ordering = ["organization__name", "user__username"]

    def __str__(self):
        return f"{self.user.username} @ {self.organization.name} ({self.role})"


class UserProfile(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="asm_profile",
    )
    phone_number = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Profile for {self.user.username}"
