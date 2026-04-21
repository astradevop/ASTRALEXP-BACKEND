"""
Gemini AI Service for expense parsing.

Converts natural language expense messages into structured JSON data.
"""

import json
import re
import logging
import base64
import time
from datetime import datetime, timezone

from google import genai
from google.genai import types
from google.genai.errors import ClientError
from django.conf import settings

logger = logging.getLogger(__name__)


# ─── Configure Gemini ─────────────────────────────────────────────────────────

_client = genai.Client(api_key=settings.GEMINI_API_KEY)


# ─── Category Map ─────────────────────────────────────────────────────────────

VALID_CATEGORIES = [
    "food", "transport", "shopping", "entertainment",
    "health", "utilities", "education", "travel",
    "groceries", "rent", "subscription", "other",
]

VALID_PAYMENT_TYPES = ["upi", "bank", "card", "cash", "wallet", "other"]


# ─── Prompt Template ─────────────────────────────────────────────────────────

PARSE_PROMPT = """
You are an intelligent expense parser. Extract structured expense information from the user's message.

Current datetime (UTC): {current_datetime}
Previous extracted state (if any): {previous_state}
User message: "{user_message}"

Extract and return ONLY a valid JSON object with these fields:
{{
  "amount": <number or null>,
  "category": <one of: food, transport, shopping, entertainment, health, utilities, education, travel, groceries, rent, subscription, other — or null if unclear>,
  "payment_method_name": <string name like "GPay", "Cash", "SBI Card", or null if not mentioned>,
  "payment_method_type": <one of: upi, bank, card, cash, wallet, other — or null>,
  "expense_time": <ISO 8601 datetime string based on context like "yesterday", "last night", "8pm", now if not specified — or null>,
  "note": <short description of what was purchased, or null>,
  "is_complete": <true if amount, category and payment_method_name are all present; false otherwise>,
  "missing_fields": <list of field names that are missing or unclear, e.g. ["payment_method", "category"]>,
  "splits": [
    {{
      "friend_id": <id of the friend from the provided list, or null>,
      "amount": <the amount this friend owes, or null if to be split equally>
    }}
  ],
  "needs_friend_selection": <true if the user mentioned "friends" or splitting but didn't specify who from the list, or names were not found in the list>
}}

Friends list for matching: {friends_context}

Rules:
- If User says "split with [Friend Name]", find the friend in the provided list.
- If total amount is 1000 and user says "split with Rahul", then amount should be 1000 (total paid amount) and one split for Rahul for 500.
- If specific amounts are mentioned (e.g. "Rahul owes 300 out of 1000"), amount is 1000 and split amount for Rahul is 300.
- If Previous State has non-null values, KEEP them unless the User Message explicitly overrides them. Merge the User Message details into the Previous State.
- If amount has a calculation (e.g. "2 items 50 each"), compute the total.
- Be smart about category: "biriyani" → food, "Uber" → transport, "Netflix" → subscription.
- Be smart about payment_method_type: "GPay" → upi, "HDFC card" → card, "cash" → cash.
- Return ONLY the JSON. No explanation, no markdown, no extra text.
"""


# ─── Rule-Based Fast-Path Parser (Feature 3) ───────────────────────────

# Keyword-to-category map for the rule-based parser
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "food":         ["food", "lunch", "dinner", "breakfast", "biryani", "pizza", "burger", "chai", "coffee", "snack", "meal", "restaurant", "cafe", "eatery"],
    "transport":    ["transport", "uber", "ola", "auto", "cab", "bus", "train", "metro", "petrol", "fuel", "diesel", "rickshaw", "taxi"],
    "groceries":    ["grocery", "groceries", "vegetables", "fruits", "supermarket", "kirana"],
    "shopping":     ["shopping", "clothes", "shirt", "shoes", "amazon", "flipkart", "mall"],
    "health":       ["medicine", "pharmacy", "doctor", "hospital", "clinic", "medical", "health"],
    "utilities":    ["electricity", "water", "gas", "wifi", "internet", "bill", "recharge", "utility"],
    "entertainment":["movie", "cinema", "netflix", "hotstar", "spotify", "gaming", "game", "entertainment", "concert"],
    "education":    ["course", "book", "tuition", "school", "college", "fees", "education"],
    "travel":       ["hotel", "flight", "trip", "holiday", "vacation", "travel", "train ticket", "bus ticket"],
    "subscription": ["subscription", "premium", "membership", "monthly plan"],
    "rent":         ["rent", "pg", "hostel", "housing"],
}

# Payment method name → type hints for the rule-based parser
_PM_TYPE_HINTS: dict[str, str] = {
    "gpay": "upi", "google pay": "upi", "phonepe": "upi", "paytm": "upi",
    "bhim": "upi", "upi": "upi",
    "cash": "cash",
    "card": "card", "debit card": "card", "credit card": "card",
    "hdfc": "card", "icici": "card", "sbi card": "card", "axis": "card",
    "net banking": "bank", "neft": "bank", "imps": "bank",
    "wallet": "wallet", "freecharge": "wallet", "mobikwik": "wallet",
}


def _guess_category(text: str) -> str | None:
    """Return the best matching category from keyword lookup, or None."""
    lower = text.lower()
    for category, keywords in _CATEGORY_KEYWORDS.items():
        if any(kw in lower for kw in keywords):
            return category
    return None


def _guess_payment_method(text: str) -> tuple[str | None, str | None]:
    """
    Return (payment_method_name, payment_method_type) guessed from the text.
    Returns (None, None) if no payment method is detected.
    """
    lower = text.lower()
    for keyword, pm_type in _PM_TYPE_HINTS.items():
        if keyword in lower:
            # Capitalise the raw keyword as the method name (e.g. 'gpay' → 'GPay')
            name_map = {
                "gpay": "GPay", "google pay": "Google Pay", "phonepe": "PhonePe",
                "paytm": "Paytm", "bhim": "BHIM", "upi": "UPI",
                "cash": "Cash", "card": "Card", "debit card": "Debit Card",
                "credit card": "Credit Card", "net banking": "Net Banking",
                "neft": "NEFT", "imps": "IMPS", "wallet": "Wallet",
                "freecharge": "FreeCharge", "mobikwik": "MobiKwik",
            }
            return name_map.get(keyword, keyword.title()), pm_type
    return None, None


# Patterns to extract an amount from simple strings like:
#   "paid 200", "spent 350.50", "200 rs", "₹500"
_AMOUNT_PATTERNS = [
    re.compile(r'(?:paid|spent|spend|pay|cost|costs?|\u20b9)\s*(?:rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)', re.IGNORECASE),
    re.compile(r'([\d,]+(?:\.\d{1,2})?)\s*(?:rs|rupees?|\/-|INR)', re.IGNORECASE),
    re.compile(r'^(?:rs\.?\s*)?([\d,]+(?:\.\d{1,2})?)$', re.IGNORECASE),  # bare number
]


def try_rule_based_parse(user_message: str) -> dict | None:
    """
    Attempt to parse a simple expense message using only regex + keyword rules.

    Returns a partial expense dict (same keys as the Gemini response) if the
    amount can be extracted, or None to signal that Gemini should be called.

    This is a confidence-gating fast-path: we only bypass Gemini when we can
    extract a numeric amount.  Category and payment method are best-effort.
    The result is passed back to parse_expense_from_text which will call Gemini
    only when is_complete is still False after the rule-based pass.
    """
    if not user_message:
        return None

    amount = None
    for pattern in _AMOUNT_PATTERNS:
        m = pattern.search(user_message)
        if m:
            try:
                amount = round(float(m.group(1).replace(",", "")), 2)
                break
            except (ValueError, IndexError):
                continue

    # No amount found → can't avoid Gemini
    if not amount or amount <= 0:
        return None

    category        = _guess_category(user_message)
    pm_name, pm_type = _guess_payment_method(user_message)

    is_complete = bool(amount and category and pm_name)
    missing = []
    if not category:
        missing.append("category")
    if not pm_name:
        missing.append("payment_method")

    logger.info(
        f"Rule-based parse succeeded: amount={amount}, category={category}, "
        f"pm={pm_name}, complete={is_complete}"
    )

    return {
        "success":              True,
        "amount":               amount,
        "category":             category or "other",
        "payment_method_name":  pm_name,
        "payment_method_type":  pm_type,
        "expense_time":         None,   # Gemini handles temporal reasoning
        "note":                 None,
        "is_complete":          is_complete,
        "missing_fields":       missing,
        "splits":               [],
        "needs_friend_selection": False,
    }


# ─── Parser ───────────────────────────────────────────────────────────────────

def parse_expense_from_text(user_message: str, image_base64: str = None, previous_state: dict = None, friends: list = None, valid_payment_methods: list[str] = None) -> dict:
    """
    Parse expense from natural language via a two-stage pipeline:

    Stage 1 (Rule-Based Fast Path):
        Try to extract amount, category, and payment method using regex and
        keyword rules. If all three fields are found, skip the Gemini API call
        entirely — this saves latency for clear, simple inputs.

    Stage 2 (Gemini AI Fallback):
        If the rule-based pass leaves any required field missing, send the full
        message (plus context) to Gemini for natural-language understanding.

    Always validates and sanitises the combined result before returning.
    """
    current_datetime = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    # ── Stage 1: Rule-based fast path (skip for image-only messages) ────────
    if user_message and not image_base64 and not previous_state:
        rule_result = try_rule_based_parse(user_message)
        if rule_result:
            rule_result = _validate_and_clean(rule_result, user_message, valid_payment_methods)
            if rule_result.get("is_complete"):
                # We have everything we need — no Gemini call required
                return rule_result
            logger.info("Rule-based parse incomplete; escalating to Gemini with partial hint.")

    
    friends_context = "[]"
    if friends:
        friends_context = json.dumps([
            {"id": f.id, "name": f.full_name or f.username, "email": f.email} 
            for f in friends
        ])

    # If there's an image, we still provide context to the bot
    if not user_message and image_base64:
        user_message = "Extract the expense details from the attached receipt/bill."
        
    prompt = PARSE_PROMPT.format(
        user_message=user_message,
        current_datetime=current_datetime,
        previous_state=json.dumps(previous_state or {}),
        friends_context=friends_context
    )

    contents = []
    
    if image_base64:
        # Check if the base64 string includes MimeType prefix (e.g. data:image/jpeg;base64,...)
        img_data = image_base64
        mime_type = "image/jpeg"
        if ";base64," in image_base64:
            meta, img_data = image_base64.split(";base64,", 1)
            if "image/" in meta:
                mime_type = meta.replace("data:", "")
        try:
            image_bytes = base64.b64decode(img_data)
            contents.append(types.Part.from_bytes(data=image_bytes, mime_type=mime_type))
        except Exception as e:
            logger.error(f"Failed to decode image base64: {e}")

    contents.append(prompt)

    # Try with primary model first, with retries
    max_retries = 3
    base_delay = 2  # seconds
    
    # We use a list of models to try in order
    # Note: Using 1.5-pro as it's the standard high-capacity fallback
    models_to_try = [settings.GEMINI_MODEL, "gemini-1.5-pro"]
    
    last_error = None

    for model_name in models_to_try:
        for attempt in range(max_retries):
            try:
                logger.info(f"Attempting parse with {model_name} (Attempt {attempt+1}/{max_retries})")
                response = _client.models.generate_content(
                    model=model_name,
                    contents=contents,
                )
                raw_text = response.text.strip()

                # Strip markdown code blocks if Gemini wraps JSON in them
                raw_text = re.sub(r"^```(?:json)?\n?", "", raw_text)
                raw_text = re.sub(r"\n?```$", "", raw_text)

                parsed = json.loads(raw_text)
                
                # Hard-merge from python to prevent AI dropping context
                if previous_state and isinstance(previous_state, dict):
                    for key in ["amount", "category", "payment_method_name", "expense_time", "note"]:
                        if previous_state.get(key) is not None and not previous_state.get(key) == "other":
                            if not parsed.get(key) or parsed.get(key) == "other":
                                parsed[key] = previous_state[key]

                return _validate_and_clean(parsed, user_message, valid_payment_methods)

            except (json.JSONDecodeError, Exception) as e:
                last_error = e
                # Check if it's a rate limit / 503 error
                error_str = str(e).lower()
                is_retryable = "503" in error_str or "overloaded" in error_str or "rate limit" in error_str or "429" in error_str
                
                if is_retryable and attempt < max_retries - 1:
                    wait_time = base_delay * (2 ** attempt)
                    logger.warning(f"Gemini overloaded/rate-limited. Retrying in {wait_time}s... Error: {e}")
                    time.sleep(wait_time)
                    continue
                else:
                    # If not retryable or we exhausted retries for THIS model, 
                    # break inner loop to try the NEXT model in the fallback list
                    logger.error(f"Failed with {model_name}: {e}")
                    break

    # If we reached here, both models failed after all retries
    return _error_response("The AI service is currently overloaded. Please try again in a minute.")


def _validate_and_clean(data: dict, user_message: str, valid_payment_methods: list[str] = None) -> dict:
    """Sanitize and validate the parsed fields."""

    # Clamp category
    if data.get("category") not in VALID_CATEGORIES:
        data["category"] = "other"

    # Clamp payment type
    if data.get("payment_method_type") not in VALID_PAYMENT_TYPES:
        data["payment_method_type"] = "other"

    # Validate payment method against user's actual methods if provided
    pm_name = data.get("payment_method_name")
    if pm_name and valid_payment_methods is not None:
        matched = False
        lower_pm_name = pm_name.lower()
        for valid_pm in valid_payment_methods:
            if valid_pm.lower() == lower_pm_name:
                data["payment_method_name"] = valid_pm
                matched = True
                break
        if not matched:
            data["unrecognized_payment_method"] = pm_name
            data["payment_method_name"] = None

    # Ensure amount is a positive number
    try:
        amount = float(data.get("amount") or 0)
        data["amount"] = round(amount, 2) if amount > 0 else None
    except (TypeError, ValueError):
        data["amount"] = None

    # Validate expense_time ISO format
    expense_time = data.get("expense_time")
    if expense_time:
        try:
            datetime.fromisoformat(expense_time.replace("Z", "+00:00"))
        except ValueError:
            data["expense_time"] = None

    # Ensure missing_fields is a list
    if not isinstance(data.get("missing_fields"), list):
        data["missing_fields"] = []

    # Re-evaluate is_complete
    data["is_complete"] = bool(
        data.get("amount")
        and data.get("category")
        and data.get("payment_method_name")
    )

    if not data["is_complete"]:
        missing = []
        if not data.get("amount"):
            missing.append("amount")
        if not data.get("category") or data.get("category") == "other":
            missing.append("category")
        if not data.get("payment_method_name"):
            missing.append("payment_method")
        data["missing_fields"] = missing

    # Handle splits sanitization
    splits = data.get("splits", [])
    if not isinstance(splits, list):
        splits = []
    
    cleaned_splits = []
    for s in splits:
        fid = s.get("friend_id")
        amt = s.get("amount")
        if fid:
            try:
                amt = float(amt) if amt else 0
                cleaned_splits.append({"friend_id": fid, "amount": round(amt, 2)})
            except (TypeError, ValueError):
                pass
    data["splits"] = cleaned_splits

    # Flag if user mentioned friends/splitting but no friends were successfully matched
    needs_selection = False
    lower_msg = user_message.lower()
    if ("friend" in lower_msg or "split" in lower_msg or "share" in lower_msg) and not cleaned_splits:
        needs_selection = True
    data["needs_friend_selection"] = needs_selection

    data["success"] = True
    return data


def _error_response(message: str) -> dict:
    return {
        "success": False,
        "error": message,
        "amount": None,
        "category": None,
        "payment_method_name": None,
        "payment_method_type": None,
        "expense_time": None,
        "note": None,
        "is_complete": False,
        "missing_fields": [],
        "unrecognized_payment_method": None,
    }
