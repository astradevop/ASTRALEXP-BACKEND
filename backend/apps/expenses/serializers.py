from rest_framework import serializers
from .models import Expense
from apps.payments.serializers import PaymentMethodSerializer


class ExpenseSerializer(serializers.ModelSerializer):
    """Full expense serializer for read operations."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    payment_method_detail = PaymentMethodSerializer(source="payment_method", read_only=True)

    class Meta:
        model = Expense
        fields = (
            "id",
            "amount",
            "category",
            "category_display",
            "note",
            "expense_time",
            "logged_time",
            "raw_input",
            "payment_method",
            "payment_method_detail",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "logged_time", "category_display", "payment_method_detail", "created_at", "updated_at")

    def validate_payment_method(self, value):
        """Ensure the payment method belongs to the authenticated user."""
        if value and value.user != self.context["request"].user:
            raise serializers.ValidationError("Invalid payment method.")
        return value

    def create(self, validated_data):
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class ExpenseListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing expenses."""

    category_display = serializers.CharField(source="get_category_display", read_only=True)
    payment_method_name = serializers.CharField(
        source="payment_method.name", read_only=True, default=None
    )

    class Meta:
        model = Expense
        fields = (
            "id",
            "amount",
            "category",
            "category_display",
            "note",
            "expense_time",
            "payment_method",
            "payment_method_name",
        )
