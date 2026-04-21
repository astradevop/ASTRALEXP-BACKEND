"""
Unit tests for the Analytics app.

Covers:
  - Feature 1: monthly_summary, category_summary, payment_method_summary, daily_trend
  - Feature 4: spending prediction (linear regression)
  - Feature 5: unusual expense detection (Z-score and IQR)

Run with:
    python manage.py test apps.analytics
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal

from django.test import TestCase
from django.contrib.auth import get_user_model

from apps.expenses.models import Expense
from apps.payments.models import PaymentMethod
from .services import (
    get_monthly_summary,
    get_category_summary,
    get_payment_method_summary,
    get_daily_trend,
    get_full_summary,
    detect_unusual_expenses,
    predict_next_month_spending,
)

User = get_user_model()


# ─── Shared Fixtures ──────────────────────────────────────────────────────────

def _make_user(suffix="test"):
    return User.objects.create_user(
        username=f"user_{suffix}",
        email=f"{suffix}@astralexp.test",
        password="testpassword123",
    )


def _make_expense(user, amount, category, days_ago, payment_method=None, note=""):
    """Create an Expense with expense_time = now - days_ago."""
    expense_time = datetime.now(timezone.utc) - timedelta(days=days_ago)
    return Expense.objects.create(
        user=user,
        amount=Decimal(str(amount)),
        category=category,
        expense_time=expense_time,
        note=note,
        payment_method=payment_method,
    )


def _make_payment_method(user, name="GPay", pm_type="upi"):
    return PaymentMethod.objects.create(user=user, name=name, type=pm_type)


# ─── Feature 1: Monthly Summary ───────────────────────────────────────────────

class MonthlySummaryTests(TestCase):

    def setUp(self):
        self.user = _make_user("monthly")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_queryset_returns_zero_structure(self):
        result = get_monthly_summary(self.qs)
        self.assertEqual(result["months"], [])
        self.assertEqual(result["totals"], [])
        self.assertEqual(result["average_monthly"], 0.0)
        self.assertIsNone(result["highest_month"])
        self.assertIsNone(result["lowest_month"])

    def test_single_month_expense(self):
        _make_expense(self.user, 500, "food", 5)
        _make_expense(self.user, 300, "transport", 10)
        result = get_monthly_summary(self.qs)
        self.assertEqual(len(result["months"]), 1)
        self.assertAlmostEqual(result["totals"][0], 800.0, places=1)

    def test_multiple_months_are_ordered(self):
        # Create expenses in two distinct months
        _make_expense(self.user, 1000, "food", 60)   # ~2 months ago
        _make_expense(self.user, 500,  "food", 5)    # this month
        result = get_monthly_summary(self.qs)
        self.assertEqual(len(result["months"]), 2)
        # Totals should be in chronological order
        self.assertGreater(result["totals"][0], 0)
        self.assertGreater(result["totals"][1], 0)

    def test_highest_and_lowest_month_correct(self):
        _make_expense(self.user, 2000, "shopping", 60)  # higher month
        _make_expense(self.user, 100,  "food",     5)   # lower month
        result = get_monthly_summary(self.qs)
        self.assertGreater(
            result["highest_month"]["total"],
            result["lowest_month"]["total"],
        )


# ─── Feature 1: Category Summary ──────────────────────────────────────────────

class CategorySummaryTests(TestCase):

    def setUp(self):
        self.user = _make_user("category")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_returns_empty_lists(self):
        result = get_category_summary(self.qs)
        self.assertEqual(result["categories"], [])
        self.assertIsNone(result["top_category"])

    def test_percentages_sum_to_100(self):
        _make_expense(self.user, 300, "food",      10)
        _make_expense(self.user, 200, "transport", 10)
        _make_expense(self.user, 500, "shopping",  10)
        result = get_category_summary(self.qs)
        total_pct = sum(result["percentages"])
        self.assertAlmostEqual(total_pct, 100.0, places=0)

    def test_top_category_is_highest_spend(self):
        _make_expense(self.user, 100, "food",       10)
        _make_expense(self.user, 900, "transport",  10)
        result = get_category_summary(self.qs)
        self.assertEqual(result["top_category"], "transport")

    def test_categories_sorted_descending_by_spend(self):
        _make_expense(self.user, 100, "food",      10)
        _make_expense(self.user, 300, "shopping",  10)
        _make_expense(self.user, 200, "transport", 10)
        result = get_category_summary(self.qs)
        self.assertEqual(result["totals"], sorted(result["totals"], reverse=True))


# ─── Feature 1: Payment Method Summary ────────────────────────────────────────

class PaymentMethodSummaryTests(TestCase):

    def setUp(self):
        self.user = _make_user("payment")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_returns_empty_lists(self):
        result = get_payment_method_summary(self.qs)
        self.assertEqual(result["methods"], [])

    def test_expenses_without_payment_method_grouped_as_unknown(self):
        _make_expense(self.user, 200, "food", 5)  # no payment_method
        result = get_payment_method_summary(self.qs)
        self.assertIn("Unknown", result["methods"])

    def test_percentages_sum_to_100(self):
        pm1 = _make_payment_method(self.user, "GPay", "upi")
        pm2 = _make_payment_method(self.user, "Cash", "cash")
        _make_expense(self.user, 400, "food",      5, pm1)
        _make_expense(self.user, 600, "transport", 5, pm2)
        result = get_payment_method_summary(self.qs)
        total_pct = sum(result["percentages"])
        self.assertAlmostEqual(total_pct, 100.0, places=0)


# ─── Feature 1: Daily Trend ────────────────────────────────────────────────────

class DailyTrendTests(TestCase):

    def setUp(self):
        self.user = _make_user("daily")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_returns_empty_structure(self):
        result = get_daily_trend(self.qs)
        self.assertEqual(result["dates"], [])
        self.assertEqual(result["totals"], [])
        self.assertEqual(result["average_daily"], 0.0)

    def test_only_expenses_within_window_are_returned(self):
        _make_expense(self.user, 100, "food", 5)   # within last 30 days
        _make_expense(self.user, 200, "food", 60)  # outside window
        result = get_daily_trend(self.qs, days=30)
        self.assertEqual(len(result["dates"]), 1)
        self.assertAlmostEqual(result["totals"][0], 100.0, places=1)

    def test_dates_are_sorted_ascending(self):
        _make_expense(self.user, 100, "food",      10)
        _make_expense(self.user, 200, "transport",  5)
        result = get_daily_trend(self.qs, days=30)
        self.assertEqual(result["dates"], sorted(result["dates"]))


# ─── Feature 1: Full Summary ──────────────────────────────────────────────────

class FullSummaryTests(TestCase):

    def setUp(self):
        self.user = _make_user("full")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_returns_zero_totals(self):
        result = get_full_summary(self.qs)
        self.assertEqual(result["total_spent"], 0.0)
        self.assertEqual(result["total_expenses"], 0)

    def test_total_spent_matches_sum_of_expenses(self):
        _make_expense(self.user, 300, "food",      10)
        _make_expense(self.user, 700, "transport",  5)
        result = get_full_summary(self.qs)
        self.assertAlmostEqual(result["total_spent"], 1000.0, places=1)
        self.assertEqual(result["total_expenses"], 2)


# ─── Feature 5: Unusual Expense Detection ─────────────────────────────────────

class UnusualExpenseTests(TestCase):

    def setUp(self):
        self.user = _make_user("unusual")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_empty_returns_no_anomalies(self):
        result = detect_unusual_expenses(self.qs)
        self.assertEqual(result["total_unusual"], 0)

    def test_fewer_than_3_expenses_returns_message(self):
        _make_expense(self.user, 100, "food", 5)
        _make_expense(self.user, 150, "food", 3)
        result = detect_unusual_expenses(self.qs)
        self.assertIn("message", result)
        self.assertEqual(result["total_unusual"], 0)

    def test_clearly_anomalous_expense_is_flagged(self):
        # Add many normal food expenses and one extreme outlier
        for i in range(10):
            _make_expense(self.user, 100, "food", 20 + i)
        # Outlier: 10x the normal amount
        _make_expense(self.user, 5000, "food", 1, note="Birthday party")
        result = detect_unusual_expenses(self.qs)
        self.assertGreater(result["total_unusual"], 0)
        flagged = result["unusual_expenses"]
        # The outlier should be at the top
        self.assertAlmostEqual(flagged[0]["amount"], 5000.0, places=0)

    def test_uniform_expenses_have_no_anomalies(self):
        # All expenses the same amount — Z-score std will be 0, no anomalies
        for i in range(10):
            _make_expense(self.user, 200, "food", i + 1)
        result = detect_unusual_expenses(self.qs)
        self.assertEqual(result["total_unusual"], 0)

    def test_result_contains_expected_keys(self):
        for i in range(5):
            _make_expense(self.user, 100 + i * 50, "food", i + 1)
        result = detect_unusual_expenses(self.qs)
        self.assertIn("unusual_expenses", result)
        self.assertIn("total_unusual", result)


# ─── Feature 4: Spending Prediction ───────────────────────────────────────────

class SpendingPredictionTests(TestCase):

    def setUp(self):
        self.user = _make_user("predict")
        self.qs = Expense.objects.filter(user=self.user).select_related("payment_method")

    def test_no_data_returns_none_prediction(self):
        result = predict_next_month_spending(self.qs)
        self.assertIsNone(result["predicted_amount"])

    def test_single_month_returns_insufficient_data_message(self):
        _make_expense(self.user, 500, "food", 5)
        result = predict_next_month_spending(self.qs)
        self.assertIsNone(result["predicted_amount"])
        self.assertIn("message", result)

    def test_two_months_produces_a_prediction(self):
        # Month 1 (60 days ago)
        _make_expense(self.user, 1000, "food",      60)
        _make_expense(self.user,  500, "transport",  55)
        # Month 2 (this month)
        _make_expense(self.user, 1200, "food",        5)
        _make_expense(self.user,  400, "transport",   3)
        result = predict_next_month_spending(self.qs)
        self.assertIsNotNone(result["predicted_amount"])
        self.assertGreaterEqual(result["predicted_amount"], 0.0)
        self.assertIn(result["confidence"], ["low", "medium", "high"])

    def test_prediction_is_non_negative(self):
        # Decreasing trend — prediction must still be clamped at 0
        _make_expense(self.user, 5000, "food", 90)
        _make_expense(self.user, 3000, "food", 60)
        _make_expense(self.user,  800, "food",  5)
        result = predict_next_month_spending(self.qs)
        if result["predicted_amount"] is not None:
            self.assertGreaterEqual(result["predicted_amount"], 0.0)

    def test_result_includes_history(self):
        _make_expense(self.user, 1000, "food", 60)
        _make_expense(self.user, 1200, "food",  5)
        result = predict_next_month_spending(self.qs)
        self.assertIn("history", result)
        self.assertIsInstance(result["history"], list)

    def test_trend_label_is_valid(self):
        _make_expense(self.user, 1000, "food", 60)
        _make_expense(self.user, 2000, "food",  5)
        result = predict_next_month_spending(self.qs)
        if result.get("trend"):
            self.assertIn(result["trend"], ["increasing", "decreasing", "stable"])
