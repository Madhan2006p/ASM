from django.contrib.auth.models import User
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    name = serializers.CharField(source="username", read_only=True)
    confirm_password = serializers.CharField(write_only=True, required=False)
    phone = serializers.CharField(write_only=True, required=False)
    organization = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            "id",
            "username",
            "name",
            "email",
            "password",
            "confirm_password",
            "phone",
            "organization",
        )

    def validate(self, data):
        data.pop("phone", None)
        data.pop("organization", None)
        confirm = data.pop("confirm_password", None)
        if confirm and data.get("password") != confirm:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match"})
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data.get("username") or validated_data.get("email", ""),
            email=validated_data.get("email", ""),
            password=validated_data["password"],
        )
        return user
