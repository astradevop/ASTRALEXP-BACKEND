from datetime import datetime, timezone

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.expenses.models import Expense
from apps.expenses.serializers import ExpenseSerializer
from apps.payments.models import PaymentMethod
from .services import parse_expense_from_text


class ParseExpenseView(APIView):
    """
    POST /api/chat/parse/

    Accepts natural language text, parses it via Gemini,
    and optionally saves the expense if all fields are present.

    Request Body:
        {
            "message": "Had biriyani for 180 via GPay yesterday 8pm",
            "save": true   // optional — auto-save if complete (default: false)
        }

    Response (incomplete — needs more info):
        {
            "is_complete": false,
            "parsed": { ... },
            "follow_up": "Which payment method did you use?",
            "expense": null
        }

    Response (complete):
        {
            "is_complete": true,
            "parsed": { ... },
            "follow_up": null,
            "expense": { <saved expense object> }   // if save=true
        }
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        message = request.data.get("message", "").strip()
        image_base64 = request.data.get("image", None)
        auto_save = request.data.get("save", False)
        previous_state = request.data.get("previous_state", None)

        if not message and not image_base64:
            return Response(
                {"error": "Message or image is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # ── Call Gemini ──────────────────────────────────────────────────────
        parsed = parse_expense_from_text(message, image_base64=image_base64, previous_state=previous_state)

        if not parsed.get("success"):
            return Response(
                {"error": parsed.get("error", "Parsing failed.")},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # ── Build follow-up prompt for missing fields ─────────────────────────
        follow_up = _build_follow_up(parsed.get("missing_fields", []))

        # ── Auto-save if requested and data is complete ───────────────────────
        saved_expense = None
        if auto_save and parsed.get("is_complete"):
            saved_expense = _save_expense(request.user, message, parsed)

        return Response(
            {
                "is_complete": parsed["is_complete"],
                "parsed": parsed,
                "follow_up": follow_up,
                "expense": ExpenseSerializer(saved_expense).data if saved_expense else None,
            }
        )


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _build_follow_up(missing_fields: list) -> str | None:
    """Generate a human-friendly question for missing expense fields."""
    if not missing_fields:
        return None

    prompts = {
        "amount": "How much did you spend?",
        "category": "What category does this fall under? (e.g. food, transport, shopping)",
        "payment_method": "Which payment method did you use? (e.g. GPay, cash, card)",
    }

    if len(missing_fields) == 1:
        return prompts.get(missing_fields[0], "Could you clarify the missing details?")

    questions = [prompts[f] for f in missing_fields if f in prompts]
    return " Also, ".join(questions) if questions else "Could you provide more details?"


def _save_expense(user, raw_input: str, parsed: dict) -> Expense | None:
    """
    Create and save an Expense from parsed LLM data.
    Tries to match the payment method name to an existing one for this user.
    """
    # Resolve payment method — match by name (case-insensitive)
    payment_method = None
    pm_name = parsed.get("payment_method_name")
    if pm_name:
        payment_method = PaymentMethod.objects.filter(
            user=user, name__iexact=pm_name
        ).first()

    # Resolve expense_time
    expense_time_str = parsed.get("expense_time")
    try:
        expense_time = datetime.fromisoformat(
            expense_time_str.replace("Z", "+00:00")
        ) if expense_time_str else datetime.now(timezone.utc)
    except (ValueError, AttributeError):
        expense_time = datetime.now(timezone.utc)

    expense = Expense.objects.create(
        user=user,
        amount=parsed["amount"],
        category=parsed.get("category", "other"),
        note=parsed.get("note", ""),
        expense_time=expense_time,
        payment_method=payment_method,
        raw_input=raw_input,
    )
    return expense
