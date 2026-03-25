from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Expense
from .serializers import ExpenseSerializer, ExpenseListSerializer


class ExpenseListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/expenses/         – List all expenses (with optional filters)
    POST /api/expenses/         – Create a new expense manually

    Query Params:
        ?category=food
        ?payment_method=1
        ?ordering=-expense_time
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ["expense_time", "amount", "created_at"]
    ordering = ["-expense_time"]

    def get_queryset(self):
        qs = Expense.objects.filter(user=self.request.user).select_related("payment_method")

        # Filter by category
        category = self.request.query_params.get("category")
        if category:
            qs = qs.filter(category=category)

        # Filter by payment method
        payment_method = self.request.query_params.get("payment_method")
        if payment_method:
            qs = qs.filter(payment_method_id=payment_method)

        return qs

    def get_serializer_class(self):
        if self.request.method == "GET":
            return ExpenseListSerializer
        return ExpenseSerializer


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET    /api/expenses/{id}/  – Get expense detail
    PUT    /api/expenses/{id}/  – Full update
    PATCH  /api/expenses/{id}/  – Partial update
    DELETE /api/expenses/{id}/  – Delete
    """
    serializer_class = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(user=self.request.user).select_related("payment_method")

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.delete()
        return Response(
            {"message": "Expense deleted successfully."},
            status=status.HTTP_200_OK,
        )
