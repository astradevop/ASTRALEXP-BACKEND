from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

User = get_user_model()


# ─── Auth Serializers ─────────────────────────────────────────────────────────

class RegisterSerializer(serializers.ModelSerializer):
    """Handles user registration with password confirmation."""

    password = serializers.CharField(
        write_only=True, required=True, validators=[validate_password]
    )
    password2 = serializers.CharField(write_only=True, required=True, label="Confirm Password")

    class Meta:
        model = User
        fields = ("email", "username", "full_name", "password", "password2")

    def validate(self, attrs):
        if attrs["password"] != attrs["password2"]:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("password2")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Extends JWT payload with user info."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["email"] = user.email
        token["full_name"] = user.full_name
        return token

    def validate(self, attrs):
        # Allow login via email (default field for our model)
        data = super().validate(attrs)
        data["user"] = ProfileSerializer(self.user).data
        return data


# ─── Profile Serializers ──────────────────────────────────────────────────────

class ProfileSerializer(serializers.ModelSerializer):
    """Read serializer — used in responses."""

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "username",
            "full_name",
            "bio",
            "avatar",
            "phone",
            "subscription_tier",
            "preferred_currency",
            "date_joined",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "email", "date_joined", "created_at", "updated_at")


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Write serializer — update profile fields."""

    class Meta:
        model = User
        fields = ("username", "full_name", "bio", "avatar", "phone", "preferred_currency")

    def validate_username(self, value):
        user = self.context["request"].user
        if User.objects.exclude(pk=user.pk).filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Handles password change for authenticated users."""

    old_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(
        required=True, write_only=True, validators=[validate_password]
    )
    new_password2 = serializers.CharField(required=True, write_only=True)

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password2"]:
            raise serializers.ValidationError({"new_password": "New passwords do not match."})
        return attrs
