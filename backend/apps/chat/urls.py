from django.urls import path
from .views import ParseExpenseView

urlpatterns = [
    path("parse/", ParseExpenseView.as_view(), name="chat-parse"),
]
