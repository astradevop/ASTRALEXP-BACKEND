from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """
    Custom User model extending Django's AbstractUser.
    Adds profile fields on top of default auth fields.
    """

    # Override username – email is the primary identifier
    email = models.EmailField(unique=True)

    # Profile fields
    full_name = models.CharField(max_length=255, blank=True)
    bio = models.TextField(blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    phone = models.CharField(max_length=20, blank=True)
    subscription_tier = models.CharField(max_length=20, default="free")

    # Preferences
    CURRENCY_CHOICES = [
        ("INR", "Indian Rupee ₹"),
        ("USD", "US Dollar $"),
        ("EUR", "Euro €"),
        ("GBP", "British Pound £"),
    ]
    preferred_currency = models.CharField(
        max_length=3, choices=CURRENCY_CHOICES, default="INR"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"

    def __str__(self):
        return self.email
