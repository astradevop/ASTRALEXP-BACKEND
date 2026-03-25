from django.contrib import admin
from .models import PaymentMethod


@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ("name", "type", "user", "balance", "is_default", "created_at")
    list_filter = ("type", "is_default")
    search_fields = ("name", "user__email")
    ordering = ("-created_at",)
