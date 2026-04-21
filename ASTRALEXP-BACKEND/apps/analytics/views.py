"""
Analytics views for ASTRALEXP.

All endpoints require JWT authentication.
All heavy computation is delegated to services.py.

Endpoints:
    GET /api/analytics/summary/                 – Full combined dashboard summary
    GET /api/analytics/monthly-summary/         – Month-over-month spending totals
    GET /api/analytics/category-summary/        – Category-wise spending + percentages
    GET /api/analytics/payment-method-summary/  – Payment method breakdown
    GET /api/analytics/daily-trend/             – Daily spending for last N days (?days=30)
    GET /api/analytics/unusual-expenses/        – Statistically flagged anomalies
    GET /api/analytics/predictions/             – ML prediction for next month
    GET /api/analytics/export-csv/             – Download all expenses as CSV
"""

import logging

from django.http import StreamingHttpResponse
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.expenses.models import Expense
from .services import (
    get_full_summary,
    get_monthly_summary,
    get_category_summary,
    get_payment_method_summary,
    get_daily_trend,
    detect_unusual_expenses,
    predict_next_month_spending,
    get_expense_csv,
)

logger = logging.getLogger(__name__)


def _user_expenses(request):
    """Return a queryset of all expenses for the authenticated user."""
    return (
        Expense.objects.filter(user=request.user)
        .select_related("payment_method")
        .order_by("expense_time")
    )


# ─── Full Dashboard Summary ────────────────────────────────────────────────────

class FullSummaryView(APIView):
    """
    GET /api/analytics/summary/

    Returns a combined payload suitable for a complete analytics dashboard:
      - Total spent, total expense count, average daily
      - Monthly, category, payment method, and daily breakdowns
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = get_full_summary(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in FullSummaryView")
            return Response(
                {"error": "Failed to compute analytics summary.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Monthly Summary ───────────────────────────────────────────────────────────

class MonthlySummaryView(APIView):
    """
    GET /api/analytics/monthly-summary/

    Returns month-over-month spending totals + highest/lowest month stats.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = get_monthly_summary(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in MonthlySummaryView")
            return Response(
                {"error": "Failed to compute monthly summary.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Category Summary ─────────────────────────────────────────────────────────

class CategorySummaryView(APIView):
    """
    GET /api/analytics/category-summary/

    Returns spending totals and percentages per expense category.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = get_category_summary(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in CategorySummaryView")
            return Response(
                {"error": "Failed to compute category summary.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Payment Method Summary ────────────────────────────────────────────────────

class PaymentMethodSummaryView(APIView):
    """
    GET /api/analytics/payment-method-summary/

    Returns spending totals per payment method name.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = get_payment_method_summary(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in PaymentMethodSummaryView")
            return Response(
                {"error": "Failed to compute payment method summary.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Daily Trend ──────────────────────────────────────────────────────────────

class DailyTrendView(APIView):
    """
    GET /api/analytics/daily-trend/?days=30

    Returns per-day spending for the last N days (default: 30).
    Use ?days=7 for a weekly view.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            days_param = request.query_params.get("days", "30")
            days = max(1, min(int(days_param), 365))  # clamp 1–365
        except (ValueError, TypeError):
            days = 30

        try:
            result = get_daily_trend(_user_expenses(request), days=days)
            return Response(result)
        except Exception as e:
            logger.exception("Error in DailyTrendView")
            return Response(
                {"error": "Failed to compute daily trend.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── Unusual Expense Detection ────────────────────────────────────────────────

class UnusualExpensesView(APIView):
    """
    GET /api/analytics/unusual-expenses/

    Detects statistically anomalous expenses using Z-score (and IQR for sparse categories).
    Returns flagged expenses with their anomaly reason and statistical context.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = detect_unusual_expenses(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in UnusualExpensesView")
            return Response(
                {"error": "Failed to run anomaly detection.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── ML Spending Prediction ───────────────────────────────────────────────────

class SpendingPredictionView(APIView):
    """
    GET /api/analytics/predictions/

    Trains a Linear Regression model on the user's monthly expense history and
    predicts next month's total spending.

    Also returns:
      - Confidence level (low/medium/high) based on R² score
      - Trend direction (increasing/stable/decreasing)
      - Historical monthly totals used for training
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            result = predict_next_month_spending(_user_expenses(request))
            return Response(result)
        except Exception as e:
            logger.exception("Error in SpendingPredictionView")
            return Response(
                {"error": "Failed to compute spending prediction.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ─── CSV Export ───────────────────────────────────────────────────

class CsvExportView(APIView):
    """
    GET /api/analytics/export-csv/

    Returns all of the authenticated user's expenses as a downloadable CSV file.
    The CSV is generated by pandas and includes: id, date, time, category,
    amount, payment_method, note.

    Response Content-Type: text/csv
    Content-Disposition: attachment; filename="expenses.csv"
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            csv_buffer = get_expense_csv(_user_expenses(request))

            # Stream the CSV content as a file attachment
            response = StreamingHttpResponse(
                streaming_content=csv_buffer,
                content_type="text/csv",
            )
            response["Content-Disposition"] = 'attachment; filename="expenses.csv"'
            return response

        except Exception as e:
            logger.exception("Error in CsvExportView")
            return Response(
                {"error": "Failed to generate CSV export.", "detail": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
