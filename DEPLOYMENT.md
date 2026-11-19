# SecretPixel Cloud Deployment Guide: Vercel (Frontend) + Render (Backend)

This guide documents the complete step-by-step production deployment of **SecretPixel**:
* **Frontend**: React 18 + Vite Single Page Application on **Vercel**
* **Backend**: Python FastAPI API Gateway + Native C99 Core Engine on **Render** (via Docker or Native Environment)

---

## Architecture Overview

```
+-----------------------------------------------------------+
|               Vercel Edge Network (Frontend)              |
|             https://your-secretpixel.vercel.app           |
|                                                           |
|  - React 18 + Vite 6 + Tailwind CSS                       |
|  - Configured via VITE_API_BASE_URL                       |
|  - Client-side routing preserved via vercel.json rewrites |
+-----------------------------------------------------------+
                            |
                   HTTPS REST Calls / CORS
                            v
+-----------------------------------------------------------+
|              Render Web Service (Backend Gateway)         |
|         https://your-secretpixel-backend.onrender.com     |
|                                                           |
|  - Python FastAPI (Uvicorn)                               |
|  - CORS configured via ALLOWED_ORIGINS                    |
|  - ISO C99 Compiled Executable (secretpixel)              |
|  - Strict Subprocess execution (shell=False)              |
|  - Temporary directory sandboxing                         |
+-----------------------------------------------------------+
```

---

## Prerequisites

1. A [GitHub](https://github.com) account with this project repository pushed.
2. A free account on [Render](https://render.com).
3. A free account on [Vercel](https://vercel.com).

---

## Phase 1: Deploy Backend on Render

Deploy the backend first so you have your production API URL ready for the frontend.

### Option A: Deploy via Docker (Recommended)
This repository includes a production-ready `Dockerfile` that automatically sets up Debian, installs GCC, compiles the C99 engine natively, and runs the self-test before starting the server.

1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** and select **Web Service**.
3. Choose **Build and deploy from a Git repository** and connect your SecretPixel repository.
4. Configure the service:
   * **Name**: `secretpixel-backend` (or your chosen name)
   * **Region**: Choose the region closest to you (e.g., Oregon, Frankfurt, Singapore)
   * **Language**: `Docker` (Render automatically detects the root `Dockerfile`)
   * **Instance Type**: `Free`
5. Under **Environment Variables**, add:
   | Key | Value | Description |
   | :--- | :--- | :--- |
   | `PORT` | `8000` | Application port |
   | `HOST` | `0.0.0.0` | Bind host address |
   | `ALLOWED_ORIGINS` | `*` | *(Update to your Vercel URL once frontend is deployed)* |
6. Click **Create Web Service**.
7. Render will build the Docker container:
   * Installs GCC and dependencies
   * Compiles `secretpixel` ELF binary
   * Executes `./secretpixel test` (verifying 5/5 tests pass on Linux)
   * Starts FastAPI on port `8000`
8. When the deployment finishes, copy your Render service URL:
   `https://secretpixel-backend.onrender.com`

### Option B: Deploy as Native Python Web Service (Alternative)
If you prefer not to use Docker:
* **Language**: `Python 3`
* **Build Command**:
  ```bash
  gcc -Wall -Wextra -std=c99 -O2 main.c caesar.c bmp.c steganography.c -o secretpixel -lm && pip install -r requirements.txt
  ```
* **Start Command**:
  ```bash
  python server.py
  ```

---

## Phase 2: Deploy Frontend on Vercel

1. Log in to the [Vercel Dashboard](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Select and import your SecretPixel Git repository.
4. In the **Configure Project** screen:
   * **Project Name**: `secretpixel` (or your chosen name)
   * **Framework Preset**: `Vite`
   * **Root Directory**: Select `frontend` *(If deploying from repository root, the included `vercel.json` will automatically route to `frontend/dist`)*.
5. Expand **Environment Variables** and add:
   | Key | Value |
   | :--- | :--- |
   | `VITE_API_BASE_URL` | `https://secretpixel-backend.onrender.com` *(Paste your Render URL from Phase 1 without trailing slash)* |
6. Click **Deploy**.
7. Vercel will install dependencies and run `npm run build`. Within ~30 seconds, your site is live at:
   `https://secretpixel.vercel.app`

---

## Phase 3: Lock Down Production CORS (Security Hardening)

Once your Vercel domain is assigned:
1. Go to your [Render Dashboard](https://dashboard.render.com).
2. Open your `secretpixel-backend` service -> **Environment**.
3. Update `ALLOWED_ORIGINS` to:
   ```
   https://your-secretpixel.vercel.app,http://localhost:3000,http://127.0.0.1:8000
   ```
4. Save Changes (Render will automatically redeploy the backend with strict CORS).

---

## Phase 4: Production Verification Checklist

1. **System Health**:
   * Open `https://your-secretpixel.vercel.app`.
   * Check the top-right navbar badge: it should display a green glowing indicator with **"C Engine Ready"** (confirming live communication with Render).
2. **Hide Secret Flow**:
   * Go to **Hide Secret**.
   * Click **"Load Sample (256×256)"** (validates sample asset loading).
   * Type a test message (e.g., `"Production deployment verification OK!"`).
   * Verify the live **Caesar Cipher Preview (+3)** updates instantly.
   * Click **"Conceal Message in BMP"**.
   * Verify the stego-image preview appears with computed **PSNR > 70 dB** and MSE.
   * Click **"Download BMP"** (verifies binary delivery in browser).
3. **Extract Secret Flow**:
   * Click **"Test Extract"** or navigate to **Extract Secret**.
   * Upload the downloaded stego-image (or click **"Load Embedded Demo Image"**).
   * Click **"Extract & Decrypt Secret Message"**.
   * Verify the recovered plaintext matches 100% byte-for-byte.
   * Click **"Copy"** and verify the clipboard confirmation.
4. **Interactive Learning Visualizer**:
   * Navigate to **How It Works**.
   * Test the interactive Caesar character shifter, row padding calculator, and LSB bitmasking sandbox.

---

## Troubleshooting & Tips

* **Render Free Tier Cold Starts**:
  On Render's free tier, the web service spins down after 15 minutes of inactivity. The first request after sleep may take ~30–50 seconds to boot up. The frontend health badge will indicate *"Connecting..."* while the container wakes up, and turn green *"C Engine Ready"* once online.
* **Large BMP Uploads**:
  The backend permits uploads up to 50 MB with temporary directory sandboxing.
* **Local Development**:
  Running locally continues to work with zero configuration:
  * Backend: `.\start_server.bat` (or `python server.py`)
  * Frontend: `.\start_dev_frontend.bat` (or `cd frontend && npm run dev`)
