# AstralExp Production Deployment & APK Build Guide

This comprehensive guide explains how to transition your full-stack AstralExp monorepo (Django + React Native) into a production-ready system. This document addresses exactly how to host the backend on AWS EC2, bypass Android's unencrypted HTTP (Cleartext) restrictions natively seamlessly via Expo, and manually trigger an APK build over the web.

## 1. Hosting the Django Backend on AWS (EC2)

Instead of running `python manage.py runserver 0.0.0.0:8000` locally, you will host the Django REST application permanently online.

### Step 1.1: Launch an EC2 Instance
1. Go to AWS Console -> EC2 Dashboard -> **Launch Instance**.
2. Select **Ubuntu Server 24.04 LTS**.
3. Create a **t2.micro** (Free Tier eligible) instance.
4. Download the `.pem` key file and SSH into the machine:
   `ssh -i "your-key.pem" ubuntu@<your-ec2-public-ip>`

### Step 1.2: Set Up the Environment
Run these commands instantly inside the Ubuntu terminal:
```bash
sudo apt update
sudo apt install python3-pip python3-venv git nginx
git clone https://github.com/astradevop/ASTRALEXP.git
cd ASTRALEXP/backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn
```

### Step 1.3: Configure Production Database & Static files
Update `.env` on your EC2 specifically for prod:
```bash
nano .env # Add your Razorpay, Gemini, and EC2 Public IP to ALLOWED_HOSTS
python manage.py makemigrations
python manage.py migrate
```

### Step 1.4: Link Gunicorn & NGINX
We run Django with **Gunicorn**, and reverse proxy it onto Port 80 using **Nginx**.
Run Gunicorn in the background:
```bash
gunicorn config.wsgi:application --bind 0.0.0.0:8000 --daemon
```

Configure NGINX:
```bash
sudo nano /etc/nginx/sites-available/astralexp
```
*Paste this content:*
```nginx
server {
    listen 80;
    server_name <your-ec2-public-ip>;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
*Enable it:*
```bash
sudo ln -s /etc/nginx/sites-available/astralexp /etc/nginx/sites-enabled
sudo systemctl restart nginx
```
Your backend API is now permanently available at `http://<your-ec2-public-ip>`.

---

## 2. Bypassing Android HTTP Restrictions inside Expo

Because you do not have a custom SSL certificate/domain yet, the AWS EC2 returns connection data via HTTP (Port 80) instead of HTTPS (Port 443). By default, Android 9.0+ **strictly drops all HTTP API calls** preventing `axios` and `fetch` from hitting the AWS IP!

### How we solved it gracefully:
I proactively installed the `expo-build-properties` plugin to your frontend app and injected:
```json
// app.json
"plugins": [
  [
    "expo-build-properties",
    {
      "android": {
        "usesCleartextTraffic": true
      }
    }
  ]
]
```
When you run the APK build script, Expo will automatically translate this native instruction and forcefully inject `android:usesCleartextTraffic="true"` directly into the compiled compiled Android Manifest (`AndroidManifest.xml`)! *You don't need to eject your project!* Your physical Android phone will now securely allow fetching API requests from `http://<your-ec2-public-ip>`.

---

## 3. Creating the APK Using Expo EAS Build (Web)

To convert this React Native codebase into an installable `.apk` file for Android devices, we use Expo Application Services (EAS) cloud compilation.

### Step 3.1: Configure the API URL
Before building, open `mobile/src/services/api.js` and change your local `localhost` network IP to the AWS IP. 

### Step 3.2: Configure `eas.json`
Inside the `mobile/` directory, I've created the `eas.json` configuration file, preparing the build profile to extract `.apk` specifically rather than the default `.aab` (Google Play format).

### Step 3.3: Trigger Compile Process!
Open your terminal inside the `/mobile` directory and authenticate with Expo:
```bash
npx eas login
```
Trigger the cloud compilation:
```bash
npx eas build -p android --profile preview
```
1. Expo will compress your JS project and upload it securely to their build farm online.
2. It'll give you an immediate web link (`https://expo.dev/accounts/...`) so you can watch your Android APK build live directly in your browser.
3. Once completed (typically ~6 minutes), you can download the final `app-preview.apk` directly to your phone, install it, and use AstralExp natively!
