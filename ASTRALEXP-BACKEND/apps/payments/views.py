from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import PaymentMethod
from .serializers import PaymentMethodSerializer


class PaymentMethodListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/payment-methods/  – List all payment methods for current user
    POST /api/payment-methods/  – Create a new payment method
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)


class PaymentMethodDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/payment-methods/{id}/  – Get a specific payment method
    PUT    /api/payment-methods/{id}/  – Full update
    PATCH  /api/payment-methods/{id}/  – Partial update
    DELETE /api/payment-methods/{id}/  – Delete
    """
    serializer_class = PaymentMethodSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return PaymentMethod.objects.filter(user=self.request.user)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Payment method deleted successfully."},
            status=status.HTTP_200_OK,
        )


class PaymentMethodClearAllView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, *args, **kwargs):
        count = PaymentMethod.objects.filter(user=request.user).count()
        PaymentMethod.objects.filter(user=request.user).delete()
        return Response({"message": f"Cleared {count} payment methods."}, status=status.HTTP_200_OK)
