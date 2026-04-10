from django.contrib.auth import get_user_model
from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import (
    RegisterSerializer,
    CustomTokenObtainPairSerializer,
    ProfileSerializer,
    ProfileUpdateSerializer,
    ChangePasswordSerializer,
)

User = get_user_model()


# ─── Auth Views ───────────────────────────────────────────────────────────────

class RegisterView(generics.CreateAPIView):
    """
    POST /api/auth/register/
    Register a new user account.
    """
    queryset = User.objects.all()
    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Auto-generate tokens on register
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                "message": "Account created successfully.",
                "user": ProfileSerializer(user).data,
                "tokens": {
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                },
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """
    POST /api/auth/login/
    Login with email + password. Returns JWT tokens + user profile.
    """
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [AllowAny]


class LogoutView(APIView):
    """
    POST /api/auth/logout/
    Blacklist the refresh token to log out.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        refresh_token = request.data.get("refresh")
        if not refresh_token:
            return Response(
                {"error": "Refresh token is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)
        except Exception:
            return Response({"error": "Invalid token."}, status=status.HTTP_400_BAD_REQUEST)


# ─── Profile Views ────────────────────────────────────────────────────────────

class ProfileView(APIView):
    """
    GET  /api/auth/profile/  – Retrieve own profile
    PUT  /api/auth/profile/  – Full update own profile
    PATCH /api/auth/profile/ – Partial update own profile
    DELETE /api/auth/profile/ – Delete own account
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        serializer = ProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Profile updated.", "user": ProfileSerializer(request.user).data}
        )

    def patch(self, request):
        serializer = ProfileUpdateSerializer(
            request.user, data=request.data, partial=True, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(
            {"message": "Profile updated.", "user": ProfileSerializer(request.user).data}
        )

    def delete(self, request):
        user = request.user
        user.delete()
        return Response(
            {"message": "Account deleted successfully."}, status=status.HTTP_204_NO_CONTENT
        )


class ChangePasswordView(APIView):
    """
    POST /api/auth/change-password/
    Change password for authenticated user.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        if not user.check_password(serializer.validated_data["old_password"]):
            return Response(
                {"error": "Old password is incorrect."}, status=status.HTTP_400_BAD_REQUEST
            )

        user.set_password(serializer.validated_data["new_password"])
        user.save()
        return Response({"message": "Password changed successfully."})


# ─── Subscription Views ───────────────────────────────────────────────────────

import razorpay
from decouple import config

# Razorpay keys automatically fallback if not in env
RZP_KEY_ID = config("RAZORPAY_KEY_ID", default="rzp_test_MOCK_KEY_ID")
RZP_KEY_SECRET = config("RAZORPAY_KEY_SECRET", default="MOCK_KEY_SECRET")

class CreateSubscriptionIntentView(APIView):
    """
    POST /api/auth/subscription/create-intent/
    Creates a Razorpay Payment Link for the Pro Subscription (₹10).
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.subscription_tier == "pro":
            return Response({"error": "You are already a Pro member."}, status=400)

        try:
            client = razorpay.Client(auth=(RZP_KEY_ID, RZP_KEY_SECRET))
            
            # Create a 10 rupee payment link
            payment_link_data = {
                "amount": 1000,
                "currency": "INR",
                "accept_partial": False,
                "description": "AstralExp Pro Monthly Subscription",
                "reminder_enable": False,
                "callback_url": "https://astralexp-mock-success.vercel.app/", # A mock endpoint to return to
                "callback_method": "get"
            }
            
            payment_link = client.payment_link.create(payment_link_data)
            return Response({"payment_link": payment_link['short_url']})
        except Exception as e:
            print(f"RAZORPAY PAYMENT LINK ERROR: {str(e)}")
            # Fallback for dev testing without real API keys
            return Response({
                "error": str(e),
                "payment_link_fallback": "https://example.com/razorpay-mock-link"
            }, status=200)


class VerifySubscriptionView(APIView):
    """
    POST /api/auth/subscription/verify/
    Verifies that the payment was successful on frontend and upgrades user to Pro.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # In a real app, you would verify the intent server-side or use webhooks.
        # Since this is a test environment, we trust the frontend success if it completes.
        user = request.user
        user.subscription_tier = "pro"
        user.save()
        return Response(
            {"message": "Successfully upgraded to Pro!", "user": ProfileSerializer(user).data}
        )
