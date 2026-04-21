"""
Analytics services for ASTRALEXP.

All data processing is handled here using pandas, numpy, and scikit-learn.
Views only call these functions and return the results as JSON.

Feature coverage:
  - Feature 1:  Pandas expense analytics (monthly, category, payment method, daily trend)
  - Feature 1+: CSV export of all user expenses
  - Feature 4:  Spending prediction via scikit-learn Linear Regression
  - Feature 5:  Unusual expense detection via Z-score / IQR statistical analysis
"""

import logging
from datetime import timezone as tz
from decimal import Decimal

import numpy as np
import pandas as pd
from django.db.models import QuerySet

logger = logging.getLogger(__name__)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _expenses_to_df(expenses_qs: QuerySet) -> pd.DataFrame:
    """
    Convert a Django Expense queryset to a pandas DataFrame.
    Returns an empty DataFrame with the expected schema if no data exists.
    """
    records = list(
        expenses_qs.values(
            "id", "amount", "category", "expense_time",
            "note", "payment_method__name", "payment_method__type",
        )
    )

    if not records:
        return pd.DataFrame(columns=[
            "id", "amount", "category", "expense_time",
            "note", "payment_method_name", "payment_method_type",
        ])

    df = pd.DataFrame(records)

    # Rename to clean names
    df.rename(columns={
        "payment_method__name": "payment_method_name",
        "payment_method__type": "payment_method_type",
    }, inplace=True)

    # Convert Decimal → float (necessary for all numpy/math ops)
    df["amount"] = df["amount"].apply(lambda x: float(x) if isinstance(x, Decimal) else float(x or 0))

    # Localise expense_time to UTC then make tz-naive for pandas
    df["expense_time"] = pd.to_datetime(df["expense_time"], utc=True).dt.tz_localize(None)

    # Derived time columns
    df["year_month"] = df["expense_time"].dt.to_period("M")
    df["date"] = df["expense_time"].dt.date
    df["month_label"] = df["expense_time"].dt.strftime("%b %Y")

    return df


def _safe_float(val, default=0.0):
    """Return a JSON-safe float, replacing NaN/Inf with a default."""
    try:
        f = float(val)
        if np.isnan(f) or np.isinf(f):
            return default
        return round(f, 2)
    except (TypeError, ValueError):
        return default


# ─── Feature 1: Monthly Summary ───────────────────────────────────────────────

def get_monthly_summary(expenses_qs: QuerySet) -> dict:
    """
    Return month-over-month spending totals.

    Output:
        {
            "months": ["Jan 2026", "Feb 2026", ...],
            "totals": [1200.50, 980.00, ...],
            "average_monthly": 1090.25,
            "highest_month": {"label": "Jan 2026", "total": 1200.50},
            "lowest_month":  {"label": "Feb 2026", "total": 980.00},
        }
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {"months": [], "totals": [], "average_monthly": 0.0,
                "highest_month": None, "lowest_month": None}

    monthly = (
        df.groupby("year_month")["amount"]
        .sum()
        .reset_index()
        .sort_values("year_month")
    )
    monthly["label"] = monthly["year_month"].dt.strftime("%b %Y")
    totals = [_safe_float(v) for v in monthly["amount"]]
    labels = monthly["label"].tolist()

    avg = _safe_float(monthly["amount"].mean())
    max_idx = int(monthly["amount"].idxmax())
    min_idx = int(monthly["amount"].idxmin())

    return {
        "months": labels,
        "totals": totals,
        "average_monthly": avg,
        "highest_month": {"label": labels[monthly.index.get_loc(max_idx)], "total": _safe_float(monthly.loc[max_idx, "amount"])},
        "lowest_month":  {"label": labels[monthly.index.get_loc(min_idx)], "total": _safe_float(monthly.loc[min_idx, "amount"])},
    }


# ─── Feature 1: Category Summary ──────────────────────────────────────────────

def get_category_summary(expenses_qs: QuerySet) -> dict:
    """
    Return spending totals and percentages per category.

    Output:
        {
            "categories": ["food", "transport", ...],
            "totals": [500.0, 200.0, ...],
            "percentages": [62.5, 25.0, ...],
            "top_category": "food",
        }
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {"categories": [], "totals": [], "percentages": [], "top_category": None}

    cat = (
        df.groupby("category")["amount"]
        .sum()
        .reset_index()
        .sort_values("amount", ascending=False)
    )
    grand_total = cat["amount"].sum()
    cat["pct"] = (cat["amount"] / grand_total * 100).round(2)

    return {
        "categories": cat["category"].tolist(),
        "totals": [_safe_float(v) for v in cat["amount"]],
        "percentages": [_safe_float(v) for v in cat["pct"]],
        "top_category": cat.iloc[0]["category"] if not cat.empty else None,
    }


# ─── Feature 1: Payment Method Summary ────────────────────────────────────────

def get_payment_method_summary(expenses_qs: QuerySet) -> dict:
    """
    Return spending totals per payment method name.

    Output:
        {
            "methods": ["GPay", "Cash", ...],
            "totals": [800.0, 200.0, ...],
            "percentages": [80.0, 20.0, ...],
        }
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {"methods": [], "totals": [], "percentages": []}

    df["payment_method_name"] = df["payment_method_name"].fillna("Unknown")
    pm = (
        df.groupby("payment_method_name")["amount"]
        .sum()
        .reset_index()
        .sort_values("amount", ascending=False)
    )
    grand_total = pm["amount"].sum()
    pm["pct"] = (pm["amount"] / grand_total * 100).round(2)

    return {
        "methods": pm["payment_method_name"].tolist(),
        "totals": [_safe_float(v) for v in pm["amount"]],
        "percentages": [_safe_float(v) for v in pm["pct"]],
    }


# ─── Feature 1: Daily Trend ───────────────────────────────────────────────────

def get_daily_trend(expenses_qs: QuerySet, days: int = 30) -> dict:
    """
    Return per-day spending for the last N days.

    Output:
        {
            "dates": ["2026-04-01", ...],
            "totals": [250.0, ...],
            "average_daily": 83.33,
        }
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {"dates": [], "totals": [], "average_daily": 0.0}

    cutoff = df["expense_time"].max() - pd.Timedelta(days=days - 1)
    df = df[df["expense_time"] >= cutoff]

    daily = (
        df.groupby("date")["amount"]
        .sum()
        .reset_index()
        .sort_values("date")
    )
    daily["date_str"] = daily["date"].astype(str)

    return {
        "dates": daily["date_str"].tolist(),
        "totals": [_safe_float(v) for v in daily["amount"]],
        "average_daily": _safe_float(daily["amount"].mean()),
    }


# ─── Feature 1: Full Summary (combined) ───────────────────────────────────────

def get_full_summary(expenses_qs: QuerySet) -> dict:
    """
    Return a comprehensive summary combining monthly, category, payment, and daily data.
    Calls all individual summary functions with a single queryset eval.
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {
            "total_spent": 0.0,
            "total_expenses": 0,
            "average_daily": 0.0,
            "monthly": get_monthly_summary(expenses_qs),
            "category": get_category_summary(expenses_qs),
            "payment_method": get_payment_method_summary(expenses_qs),
            "daily": get_daily_trend(expenses_qs),
        }

    # We already have the df, compute inline for efficiency
    total_spent = _safe_float(df["amount"].sum())
    total_count = len(df)
    days_covered = max((df["expense_time"].max() - df["expense_time"].min()).days, 1)
    avg_daily = _safe_float(total_spent / days_covered)

    return {
        "total_spent": total_spent,
        "total_expenses": total_count,
        "average_daily": avg_daily,
        "monthly": get_monthly_summary(expenses_qs),
        "category": get_category_summary(expenses_qs),
        "payment_method": get_payment_method_summary(expenses_qs),
        "daily": get_daily_trend(expenses_qs),
    }


# ─── Feature 5: Unusual Expense Detection ─────────────────────────────────────

def detect_unusual_expenses(expenses_qs: QuerySet, z_threshold: float = 2.0) -> dict:
    """
    Detect abnormally high expenses per category using Z-score analysis.

    Logic:
      1. For each category, compute mean and standard deviation of amounts.
      2. Flag any expense whose Z-score exceeds z_threshold (default: 2.0 std devs above mean).
      3. For categories with fewer than 3 data points, use IQR-based outlier detection instead.

    Output:
        {
            "unusual_expenses": [
                {
                    "id": 42,
                    "amount": 5000.0,
                    "category": "food",
                    "note": "Birthday dinner",
                    "expense_time": "2026-04-15T20:00:00",
                    "z_score": 3.2,
                    "category_mean": 350.0,
                    "reason": "3.2× above your usual food spending",
                }
            ],
            "total_unusual": 1,
        }
    """
    df = _expenses_to_df(expenses_qs)

    if df.empty or len(df) < 3:
        return {"unusual_expenses": [], "total_unusual": 0,
                "message": "Not enough expense history to detect anomalies. Log at least 3 expenses."}

    flagged = []

    for category, group in df.groupby("category"):
        amounts = group["amount"].values

        if len(amounts) < 3:
            # IQR method for sparse categories
            q1, q3 = np.percentile(amounts, 25), np.percentile(amounts, 75)
            iqr = q3 - q1
            upper_fence = q3 + 1.5 * iqr
            unusual = group[group["amount"] > upper_fence]

            for _, row in unusual.iterrows():
                flagged.append({
                    "id": int(row["id"]),
                    "amount": _safe_float(row["amount"]),
                    "category": row["category"],
                    "note": row.get("note", ""),
                    "expense_time": row["expense_time"].isoformat() if pd.notna(row["expense_time"]) else None,
                    "z_score": None,
                    "category_mean": _safe_float(np.mean(amounts)),
                    "detection_method": "IQR",
                    "reason": f"Notably higher than your usual {category} spending",
                })

        else:
            # Z-score method for categories with sufficient data
            mean = np.mean(amounts)
            std = np.std(amounts)

            if std == 0:
                continue  # All expenses equal — no anomaly possible

            group = group.copy()
            group["z_score"] = (group["amount"] - mean) / std
            unusual = group[group["z_score"] > z_threshold]

            for _, row in unusual.iterrows():
                z = _safe_float(row["z_score"])
                flagged.append({
                    "id": int(row["id"]),
                    "amount": _safe_float(row["amount"]),
                    "category": row["category"],
                    "note": row.get("note", ""),
                    "expense_time": row["expense_time"].isoformat() if pd.notna(row["expense_time"]) else None,
                    "z_score": z,
                    "category_mean": _safe_float(mean),
                    "detection_method": "Z-score",
                    "reason": f"{z:.1f}× above your usual {category} spending",
                })

    # Sort by z_score descending (most unusual first), None z_scores at end
    flagged.sort(key=lambda x: (x["z_score"] is None, -(x["z_score"] or 0)))

    return {
        "unusual_expenses": flagged,
        "total_unusual": len(flagged),
    }


# ─── Feature 4: Spending Prediction ───────────────────────────────────────────

def predict_next_month_spending(expenses_qs: QuerySet) -> dict:
    """
    Predict next month's total spending using scikit-learn Linear Regression.

    Strategy:
      1. Aggregate expenses by calendar month → monthly totals.
      2. Use sequential month index (1, 2, 3...) as the single feature X.
      3. Train LinearRegression on (X, totals).
      4. Predict for month_index = len(months) + 1.
      5. Return predicted amount and a confidence label based on R² score.

    Requirements:
      - At least 2 months of data to train.
      - Returns a "not enough data" message if insufficient history.

    Output:
        {
            "predicted_amount": 1150.0,
            "confidence": "medium",      # low / medium / high
            "r2_score": 0.78,
            "months_trained_on": 4,
            "trend": "increasing",       # increasing / decreasing / stable
            "message": "Based on 4 months of history",
        }
    """
    from sklearn.linear_model import LinearRegression

    df = _expenses_to_df(expenses_qs)

    if df.empty:
        return {
            "predicted_amount": None,
            "confidence": None,
            "message": "No expense data available for prediction.",
        }

    monthly = (
        df.groupby("year_month")["amount"]
        .sum()
        .reset_index()
        .sort_values("year_month")
    )

    n_months = len(monthly)

    if n_months < 2:
        return {
            "predicted_amount": None,
            "confidence": None,
            "message": "Need at least 2 months of data to make a prediction. Keep logging!",
        }

    # Feature engineering: month index starting at 1
    X = np.arange(1, n_months + 1).reshape(-1, 1)
    y = monthly["amount"].values.astype(float)

    model = LinearRegression()
    model.fit(X, y)

    # Predict next month
    next_month_idx = np.array([[n_months + 1]])
    prediction = float(model.predict(next_month_idx)[0])
    prediction = max(prediction, 0.0)  # Cap at 0 — can't predict negative spending

    # R² score (only meaningful with >= 3 points)
    r2 = float(model.score(X, y)) if n_months >= 3 else None

    # Confidence label based on R²
    if r2 is None:
        confidence = "low"
    elif r2 >= 0.8:
        confidence = "high"
    elif r2 >= 0.5:
        confidence = "medium"
    else:
        confidence = "low"

    # Trend direction based on regression slope
    slope = float(model.coef_[0])
    if slope > 50:
        trend = "increasing"
    elif slope < -50:
        trend = "decreasing"
    else:
        trend = "stable"

    # Build historical context for the frontend
    history = [
        {"label": str(row["year_month"]), "total": _safe_float(row["amount"])}
        for _, row in monthly.iterrows()
    ]

    return {
        "predicted_amount": _safe_float(prediction),
        "confidence": confidence,
        "r2_score": _safe_float(r2) if r2 is not None else None,
        "months_trained_on": n_months,
        "slope": _safe_float(slope),
        "trend": trend,
        "history": history,
        "message": f"Based on {n_months} month{'s' if n_months > 1 else ''} of history.",
    }


# ─── Feature 1+: CSV Export ───────────────────────────────────────────────────

def get_expense_csv(expenses_qs: QuerySet) -> "io.StringIO":
    """
    Export all expenses for a user as a CSV file using pandas.

    Columns:
        id, date, time, category, amount, payment_method, note

    Returns a StringIO buffer ready to be served as an attachment.
    """
    import io

    df = _expenses_to_df(expenses_qs)

    if df.empty:
        buf = io.StringIO()
        buf.write("id,date,time,category,amount,payment_method,note\n")
        buf.seek(0)
        return buf

    export_df = pd.DataFrame({
        "id":             df["id"],
        "date":           df["expense_time"].dt.strftime("%Y-%m-%d"),
        "time":           df["expense_time"].dt.strftime("%H:%M"),
        "category":       df["category"],
        "amount":         df["amount"].round(2),
        "payment_method": df["payment_method_name"].fillna("Unknown"),
        "note":           df["note"].fillna(""),
    }).sort_values("date", ascending=False)

    buf = io.StringIO()
    export_df.to_csv(buf, index=False)
    buf.seek(0)
    return buf
