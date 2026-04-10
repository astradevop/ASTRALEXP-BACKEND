# 🚀 AstralExp: Local Development & Testing Guide

This guide explains how to spin up both the Backend and Frontend for local testing on your machine.

---

### 1. ⚙️ Backend Setup (Django API)
The backend manages data, AI parsing, and user authentication.

1.  **Open a terminal** and navigate to the backend folder:
    ```powershell
    cd B:\Astradev\ASTRALEXP\ASTRALEXP-BACKEND
    ```
2.  **Activate the Virtual Environment**:
    ```powershell
    .\venv\Scripts\activate
    ```
3.  **Ensure Environment Variables are Set**:
    Check and edit the `.env` file to ensure `SECRET_KEY`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `GEMINI_API_KEY` are correct.
4.  **Run the Server**:
    ```powershell
    python manage.py runserver
    ```
    *The API will be live at: http://127.0.0.1:8000/*

---

### 2. 📱 Frontend Setup (Expo App)
The frontend is built with React Native and Expo.

1.  **Open a new terminal** and navigate to the frontend folder:
    ```powershell
    cd B:\Astradev\ASTRALEXP\ASTRALEXP-FRONTEND
    ```
2.  **Check API Endpoint**:
    Open `src/services/api.js` and update `BASE_URL`:
    - For **PC Emulator**: Change `BASE_URL` to `http://10.0.2.2:8000/api`
    - For **Physical Device** (over same Wi-Fi): Change `BASE_URL` to `http://YOUR_LOCAL_IP:8000/api`
3.  **Start the Expo App**:
    ```powershell
    npm start
    ```
4.  **Launch the App**:
    - Press `a` for Android Emulator.
    - Press `i` for iOS Simulator.
    - Or scan the QR code with the **Expo Go** app on your phone.

---

### 🛠️ Troubleshooting
- **Database Connection**: Ensure your PostgreSQL server is running locally before starting the backend.
- **Port Conflicts**: If port 8000 is occupied, you can run `python manage.py runserver 8001` and update the mobile `BASE_URL` accordingly.
- **Node Modules**: If you see missing module errors, run `npm install` in the frontend folder again.

---
**Happy Testing! 💸**
