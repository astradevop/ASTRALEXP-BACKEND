from django.db import models
from django.conf import settings


class PaymentMethod(models.Model):
    """
    Represents a user's payment method.
    E.g. GPay, SBI Bank Account, HDFC Credit Card, Cash.
    """

    TYPE_CHOICES = [
        ("upi", "UPI"),
        ("bank", "Bank Account"),
        ("card", "Credit/Debit Card"),
        ("cash", "Cash"),
        ("wallet", "Wallet"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payment_methods",
    )
    name = models.CharField(max_length=100)           # e.g. "GPay", "SBI Savings"
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="other")
    balance = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "payment_methods"
        verbose_name = "Payment Method"
        verbose_name_plural = "Payment Methods"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.name} ({self.get_type_display()}) — {self.user.email}"

    def save(self, *args, **kwargs):
        # Ensure only one default payment method per user
        if self.is_default:
            PaymentMethod.objects.filter(user=self.user, is_default=True).update(is_default=False)
        super().save(*args, **kwargs)
