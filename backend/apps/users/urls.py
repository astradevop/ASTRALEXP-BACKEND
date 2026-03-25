from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView, LoginView, LogoutView, ProfileView, ChangePasswordView,
    CreateSubscriptionIntentView, VerifySubscriptionView
)

urlpatterns = [
    # Auth
    path("register/", RegisterView.as_view(), name="auth-register"),
    path("login/", LoginView.as_view(), name="auth-login"),
    path("logout/", LogoutView.as_view(), name="auth-logout"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),

    # Profile CRUD
    path("profile/", ProfileView.as_view(), name="profile"),

    # Password
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),

    # Subscriptions
    path("subscription/create-intent/", CreateSubscriptionIntentView.as_view(), name="subscription-create"),
    path("subscription/verify/", VerifySubscriptionView.as_view(), name="subscription-verify"),
]
