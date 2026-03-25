# 📌 Project Requirements – Chat-Based Expense Manager (Mobile MVP)

## 🧠 Overview

A mobile-first expense management application with a chat interface where users log expenses using natural language. The system extracts structured data and stores it efficiently.

---

## 🎯 MVP Objectives

* Chat-based expense logging
* Natural language → structured data parsing
* Expense CRUD operations
* Payment method management
* Mobile-first experience (Expo)

---

## 📱 Core Features

### 1. Authentication

* User registration (email + password)
* Login with JWT authentication
* Persistent login using secure storage

---

### 2. Chat-Based Expense Logging (Primary Feature)

Users can log expenses using natural language.

**Example Input:**

```
Had biriyani for 180 via GPay yesterday 8pm
```

**Expected Extraction:**

* Amount: 180
* Category: Food
* Payment Method: GPay
* DateTime: Parsed from input
* Notes: "biriyani"

---

### 3. Missing Data Handling

If required fields are missing:

* System prompts user for clarification

**Example:**

```
User: Spent 200
System: Which payment method did you use?
```

---

### 4. Expense Management

* Create expense (via chat/manual)
* View all expenses
* Update expense
* Delete expense

---

### 5. Payment Methods

Users can create and manage:

* Bank accounts
* Credit cards
* Cash

**Fields:**

* Name
* Type (bank/card/cash)
* Balance (optional)

---

### 6. Time Handling

* If user specifies time → use it
* Always store:

  * `expense_time` (actual)
  * `logged_time` (system)

---

## 🧱 Data Models

### User

* id
* email
* password_hash

---

### Expense

* id
* user_id
* amount
* category
* note
* expense_time
* logged_time
* payment_method_id

---

### PaymentMethod

* id
* user_id
* name
* type
* balance

---

## 🔌 API Requirements

### Auth

* POST `/auth/register`
* POST `/auth/login`

---

### Chat

* POST `/chat/parse-expense`

---

### Expenses

* POST `/expenses/`
* GET `/expenses/`
* PUT `/expenses/{id}`
* DELETE `/expenses/{id}`

---

### Payment Methods

* POST `/payment-methods/`
* GET `/payment-methods/`

---

## ⚠️ Edge Cases

* "Spent 200" → missing category/payment
* "2 items 50 each" → calculate total
* "Yesterday night" → proper datetime parsing
* "Paid via card" → unclear source
* Invalid inputs → handled gracefully

---

## 🚀 MVP Deliverables

* Functional mobile app (Expo)
* Working backend APIs
* Chat-based expense logging
* Expense & payment method CRUD

---

## ❌ Out of Scope

* Financial advisor AI
* Analytics dashboard
* Budget tracking
* Notifications

---

## 🏁 Success Criteria

* Expense logged in <5 seconds
* Stable chat interaction
* Accurate parsing (≥80%)
* No crashes or data loss

---
