# ⚙️ Tech Stack – Chat-Based Expense Manager (Mobile + Backend)

## 🧠 Architecture

Mobile App (Expo) ↔ Backend API (Django) ↔ Database (PostgreSQL)

---

## 📱 Mobile App (Frontend)

### Core

* React Native (Expo)

---

### Navigation

* React Navigation

---

### Styling

* Tailwind via NativeWind

---

### State Management

* React Hooks (useState, useContext)

---

### Storage

* AsyncStorage (JWT token storage)

---

### API Communication

* Axios

---

### UI Components

* Chat interface (message bubbles)
* Input field
* Expense list screen
* Payment method screen

---

## 🔧 Backend

### Core

* Python 3.x
* Django
* Django REST Framework (DRF)

---

### Authentication

* JWT (djangorestframework-simplejwt)

---

### Database

* PostgreSQL

---

### ORM

* Django ORM

---

### Environment

* python-dotenv

---

## 🧠 NLP Layer

### Approach

* LLM-based parsing (OpenAI API or equivalent)

---

### Function

* Convert user text → structured JSON

---

### Example Prompt

```python
Extract expense details from the text.

Return JSON with:
- amount
- category
- payment_method
- datetime
- note

Text: "{user_input}"
```

---

## 🔗 API Flow

```
User → Mobile App → Backend → LLM → Structured JSON → DB → Response → UI
```

---

## 🧪 Development Tools

### Mobile

* Expo Go

---

### Backend

* Postman
* Django shell

---

## 📁 Project Structure

### Mobile

```
mobile/
 ├── screens/
 ├── components/
 ├── services/
 ├── store/
 └── App.js
```

---

### Backend

```
backend/
 ├── apps/
 │    ├── users/
 │    ├── expenses/
 │    ├── payments/
 │    ├── chat/
 └── config/
```

---

## 🔐 Security

* JWT authentication
* Input validation
* Secure token storage

---

## ⚡ Performance Strategy

* Lightweight frontend
* Backend handles parsing
* Efficient DB queries

---

## ☁️ Deployment (Future)

### Backend

* AWS EC2 / Render

### Database

* PostgreSQL (Supabase / RDS)

### Mobile

* Expo build (APK)

---

## 🚀 Final Stack (Locked)

* Expo (React Native)
* Django + DRF
* PostgreSQL
* OpenAI API

---

## ⚠️ Constraints

* No overengineering
* No custom NLP models
* Focus on shipping MVP fast

---
