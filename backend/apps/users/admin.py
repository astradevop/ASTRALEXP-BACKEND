from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ("email", "username", "full_name", "preferred_currency", "is_active", "created_at")
    list_filter = ("is_active", "is_staff", "preferred_currency")
    search_fields = ("email", "username", "full_name")
    ordering = ("-created_at",)

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("full_name", "bio", "avatar", "phone", "preferred_currency")}),
    )
