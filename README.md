# SecretPixel – Image-Based Secret Messaging Using Caesar Cipher & LSB Steganography

**SecretPixel** is an academic-grade steganography and cryptography system. It combines a classical symmetric substitution cipher (**Caesar Cipher**, shift $k=3$) with spatial-domain **Least Significant Bit (LSB)** image steganography on uncompressed 24-bit Windows Bitmap (`.bmp`) images.

The project features a **pure C99 core backend** for deterministic bitwise operations and image processing, bridged to a modern web application via a **Python FastAPI API Gateway**.

---

## Architecture Overview

```
+-----------------------------------------------------------+
|              Web Frontend (HTML5, Tailwind, JS)           |
+-----------------------------------------------------------+
                            |
                     HTTP Multipart / JSON
                            v
+-----------------------------------------------------------+
|          API Gateway (Python FastAPI / server.py)         |
|  - Request validation & BMP header checks                 |
|  - Safe subprocess execution with shell=False             |
|  - Temporary directory sandboxing                         |
+-----------------------------------------------------------+
                            |
                 Subprocess CLI Arguments & JSON
                            v
+-----------------------------------------------------------+
|           C Backend Core Engine (secretpixel.exe)         |
|  - caesar.c        : Caesar Cipher (Shift +3 / -3)        |
|  - bmp.c           : 24-bit BMP I/O & row padding handler |
|  - steganography.c : LSB embedding & extraction           |
|  - main.c          : Quality metrics (MSE/PSNR) & CLI     |
+-----------------------------------------------------------+
```

---

## Prerequisites

1. **GCC Compiler**: MinGW-w64 or GCC 9+ (bundled or installed).
2. **Python 3.9+**: For running the FastAPI API Gateway.

---

## Quick Start Guide

### 1. Build the C Backend
Run the automated build script or use GCC directly:

```powershell
# Using the Windows batch script:
.\build.bat

# Or using GCC directly:
gcc -Wall -Wextra -std=c99 -O2 main.c caesar.c bmp.c steganography.c -o secretpixel.exe -lm

# Run the 5-stage automated self-test:
.\secretpixel.exe test
```

### 2. Install Gateway Dependencies
Install the required Python packages:

```powershell
python -m pip install -r requirements.txt
```

### 3. Launch the Complete System
Start the server:

```powershell
.\start_server.bat
# Or manually via uvicorn:
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```

* **Web Application UI**: `http://127.0.0.1:8000/`
* **Interactive API Docs (Swagger UI)**: `http://127.0.0.1:8000/docs`
* **Optional Vite Dev Server (HMR)**: `.\start_dev_frontend.bat` (runs on `http://localhost:3000`)

---

## API Endpoints Summary

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Check API Gateway and C executable status |
| `POST` | `/api/embed` | Encrypt message with Caesar Cipher and hide in BMP |
| `POST` | `/api/extract` | Extract hidden bits from stego BMP and decrypt |
| `POST` | `/api/info` | Inspect BMP dimensions and maximum character capacity |
| `GET` | `/api/download/{token}` | Download generated stego BMP image |

See [API.md](file:///c:/Users/ALOK%20M/Desktop/secret%20pixel/API.md) for detailed schemas and curl examples.

---

## Core Technical Features

1. **Exact 24-bit BMP Alignment**:
   * Windows BMP scanlines must be aligned to 4-byte boundaries. SecretPixel calculates:
     $$\text{Row Padding} = (4 - ((W \times 3) \bmod 4)) \bmod 4$$
   * Steganography operations iterate exclusively over valid RGB color channels and skip row padding bytes to prevent image file corruption.
2. **Deterministic Payload Framing**:
   * Stores a 32-bit big-endian length prefix in the first 32 color channels.
   * Capacity is strictly validated before modifying any image bytes.
3. **Cover Image Preservation**:
   * The original cover image buffer is never mutated in-place; a cloned copy is modified to generate a separate stego-image.
4. **Academic Imperceptibility Metrics**:
   * Computes Mean Squared Error ($\text{MSE}$) and Peak Signal-to-Noise Ratio ($\text{PSNR}$):
     $$\text{PSNR} = 10 \cdot \log_{10}\left(\frac{255^2}{\text{MSE}}\right) \text{ dB}$$
   * 1-bit LSB replacement yields $\text{PSNR} \approx 60\text{--}80\text{ dB}$, confirming mathematical imperceptibility.
