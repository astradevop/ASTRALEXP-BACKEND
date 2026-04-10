from django.urls import path
from .views import (
    PaymentMethodListCreateView, PaymentMethodDetailView,
    PaymentMethodClearAllView
)

urlpatterns = [
    path("", PaymentMethodListCreateView.as_view(), name="payment-method-list"),
    path("<int:pk>/", PaymentMethodDetailView.as_view(), name="payment-method-detail"),
    path("clear-all/", PaymentMethodClearAllView.as_view(), name="payment-method-clear-all"),
]
