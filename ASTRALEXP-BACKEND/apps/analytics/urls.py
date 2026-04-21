from django.urls import path
from .views import (
    FullSummaryView,
    MonthlySummaryView,
    CategorySummaryView,
    PaymentMethodSummaryView,
    DailyTrendView,
    UnusualExpensesView,
    SpendingPredictionView,
    CsvExportView,
)

urlpatterns = [
    # Full combined dashboard payload (most useful for the mobile dashboard screen)
    path("summary/", FullSummaryView.as_view(), name="analytics-summary"),

    # Granular endpoints (useful for focused chart components)
    path("monthly-summary/",        MonthlySummaryView.as_view(),       name="analytics-monthly"),
    path("category-summary/",       CategorySummaryView.as_view(),      name="analytics-category"),
    path("payment-method-summary/", PaymentMethodSummaryView.as_view(), name="analytics-payment-method"),
    path("daily-trend/",            DailyTrendView.as_view(),           name="analytics-daily"),

    # AI / ML endpoints
    path("unusual-expenses/",       UnusualExpensesView.as_view(),      name="analytics-unusual"),
    path("predictions/",            SpendingPredictionView.as_view(),   name="analytics-predictions"),

    # Data export
    path("export-csv/",             CsvExportView.as_view(),            name="analytics-export-csv"),
]
