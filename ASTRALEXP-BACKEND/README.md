# AstralExp — Backend API

A clean, structured Django REST backend for the AstralExp chat-based expense manager.

---

## 🏗️ Project Structure

```
backend/
├── venv/                    # Python virtual environment
├── config/                  # Django project config
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
├── apps/
│   ├── users/               # Auth + Profile CRUD
│   ├── expenses/            # Expense CRUD
│   ├── payments/            # Payment Methods CRUD
│   └── chat/                # Gemini AI expense parser
├── manage.py
├── requirements.txt
├── .env                     # Your secrets (not committed)
└── .env.example             # Template
```

---

## ⚙️ Setup

### 1. Create & activate virtual environment
```bash
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env and fill in your values
```

### 4. Run migrations
```bash
python manage.py migrate
```

### 5. Create superuser (optional)
```bash
python manage.py createsuperuser
```

### 6. Start dev server
```bash
python manage.py runserver
```

---

## 🔑 Environment Variables

| Variable | Description |
|---|---|
| `SECRET_KEY` | Django secret key |
| `DEBUG` | `True` for dev, `False` for production |
| `DB_NAME` | PostgreSQL database name |
| `DB_USER` | PostgreSQL username |
| `DB_PASSWORD` | PostgreSQL password |
| `DB_HOST` | Database host |
| `DB_PORT` | Database port (default: 5432) |
| `GEMINI_API_KEY` | Google Gemini API key (free at ai.google.dev) |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed origins |

---

## 📡 API Endpoints

### Auth & Profile
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/auth/register/` | Register new user | No |
| POST | `/api/auth/login/` | Login (returns JWT) | No |
| POST | `/api/auth/logout/` | Blacklist refresh token | Yes |
| POST | `/api/auth/token/refresh/` | Refresh access token | No |
| GET | `/api/auth/profile/` | Get own profile | Yes |
| PUT | `/api/auth/profile/` | Full profile update | Yes |
| PATCH | `/api/auth/profile/` | Partial profile update | Yes |
| DELETE | `/api/auth/profile/` | Delete account | Yes |
| POST | `/api/auth/change-password/` | Change password | Yes |

### Expenses
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/expenses/` | List expenses (filterable) | Yes |
| POST | `/api/expenses/` | Create expense manually | Yes |
| GET | `/api/expenses/{id}/` | Get expense detail | Yes |
| PUT | `/api/expenses/{id}/` | Full update | Yes |
| PATCH | `/api/expenses/{id}/` | Partial update | Yes |
| DELETE | `/api/expenses/{id}/` | Delete expense | Yes |

**Expense List Query Params:**
- `?category=food` — filter by category
- `?payment_method=1` — filter by payment method ID
- `?ordering=-expense_time` — sort by field

### Payment Methods
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| GET | `/api/payment-methods/` | List payment methods | Yes |
| POST | `/api/payment-methods/` | Create payment method | Yes |
| GET | `/api/payment-methods/{id}/` | Get detail | Yes |
| PUT | `/api/payment-methods/{id}/` | Full update | Yes |
| PATCH | `/api/payment-methods/{id}/` | Partial update | Yes |
| DELETE | `/api/payment-methods/{id}/` | Delete | Yes |

### Chat / AI Parsing
| Method | Endpoint | Description | Auth |
|---|---|---|---|
| POST | `/api/chat/parse/` | Parse natural language expense | Yes |

**Chat Parse Request:**
```json
{
  "message": "Had biriyani for 180 via GPay yesterday 8pm",
  "save": true
}
```

**Response (complete):**
```json
{
  "is_complete": true,
  "parsed": {
    "amount": 180.00,
    "category": "food",
    "payment_method_name": "GPay",
    "payment_method_type": "upi",
    "expense_time": "2024-01-14T14:30:00+00:00",
    "note": "biriyani",
    "is_complete": true,
    "missing_fields": []
  },
  "follow_up": null,
  "expense": { "id": 1, "amount": "180.00", ... }
}
```

**Response (incomplete):**
```json
{
  "is_complete": false,
  "parsed": { "amount": 200, "category": null, ... },
  "follow_up": "Which payment method did you use?",
  "expense": null
}
```

---

## 🔐 Authentication

All protected endpoints require:
```
Authorization: Bearer <access_token>
```

---

## 📂 Categories
`food` · `transport` · `shopping` · `entertainment` · `health` · `utilities` · `education` · `travel` · `groceries` · `rent` · `subscription` · `other`

## 💳 Payment Method Types  
`upi` · `bank` · `card` · `cash` · `wallet` · `other`

---

## 🧠 Gemini API Key

Get your free key at: **https://ai.google.dev/**

Free tier: 15 RPM, 1,500 requests/day, 1M tokens/day
