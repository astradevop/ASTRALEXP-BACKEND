from django.urls import path
from .views import PaymentMethodListCreateView, PaymentMethodDetailView

urlpatterns = [
    path("", PaymentMethodListCreateView.as_view(), name="payment-method-list"),
    path("<int:pk>/", PaymentMethodDetailView.as_view(), name="payment-method-detail"),
]
