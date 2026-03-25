from django.db import models
from django.conf import settings
from apps.payments.models import PaymentMethod


class Expense(models.Model):
    """
    Core expense model.
    Tracks what was spent, when, on what, and how it was paid.
    """

    CATEGORY_CHOICES = [
        ("food", "Food & Drinks"),
        ("transport", "Transport"),
        ("shopping", "Shopping"),
        ("entertainment", "Entertainment"),
        ("health", "Health & Medical"),
        ("utilities", "Utilities & Bills"),
        ("education", "Education"),
        ("travel", "Travel"),
        ("groceries", "Groceries"),
        ("rent", "Rent & Housing"),
        ("subscription", "Subscriptions"),
        ("other", "Other"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="expenses",
    )
    payment_method = models.ForeignKey(
        PaymentMethod,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="expenses",
    )

    amount = models.DecimalField(max_digits=12, decimal_places=2)
    category = models.CharField(max_length=50, choices=CATEGORY_CHOICES, default="other")
    note = models.TextField(blank=True)

    # Time tracking
    expense_time = models.DateTimeField()          # When the expense actually occurred
    logged_time = models.DateTimeField(auto_now_add=True)   # When it was entered in the app

    # Raw input that was parsed by LLM (for reference)
    raw_input = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "expenses"
        verbose_name = "Expense"
        verbose_name_plural = "Expenses"
        ordering = ["-expense_time"]

    def __str__(self):
        return f"₹{self.amount} on {self.get_category_display()} — {self.user.email}"

    def save(self, *args, **kwargs):
        # Handle balance updates
        if self.pk:
            try:
                old_expense = Expense.objects.get(pk=self.pk)
                if old_expense.payment_method and old_expense.payment_method.balance is not None:
                    old_expense.payment_method.balance += old_expense.amount
                    old_expense.payment_method.save()
            except Expense.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        if self.payment_method and self.payment_method.balance is not None:
            self.payment_method.balance -= self.amount
            self.payment_method.save()

    def delete(self, *args, **kwargs):
        if self.payment_method and self.payment_method.balance is not None:
            self.payment_method.balance += self.amount
            self.payment_method.save()
        super().delete(*args, **kwargs)
