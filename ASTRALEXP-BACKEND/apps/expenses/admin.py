from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ("amount", "category", "user", "payment_method", "expense_time", "logged_time")
    list_filter = ("category",)
    search_fields = ("note", "user__email", "raw_input")
    ordering = ("-expense_time",)
