"""
Final Quality Assurance & Verification Suite for SecretPixel
Executes real end-to-end testing across C Engine, API Gateway, and Frontend Assets.
"""

import base64
import json
import os
import sys
import threading
import time
import urllib.request
import urllib.error
import uuid

import uvicorn
from server import app

HOST = "127.0.0.1"
PORT = 8000
BASE_URL = f"http://{HOST}:{PORT}"

def post_multipart(url, fields=None, files=None):
    boundary = uuid.uuid4().hex
    body = bytearray()

    fields = fields or {}
    for name, value in fields.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"\r\n\r\n'.encode("utf-8"))
        body.extend(f"{value}\r\n".encode("utf-8"))

    files = files or {}
    for name, (filename, content, content_type) in files.items():
        body.extend(f"--{boundary}\r\n".encode("utf-8"))
        body.extend(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"\r\n'.encode("utf-8"))
        body.extend(f"Content-Type: {content_type}\r\n\r\n".encode("utf-8"))
        body.extend(content)
        body.extend(b"\r\n")

    body.extend(f"--{boundary}--\r\n".encode("utf-8"))

    req = urllib.request.Request(
        url,
        data=bytes(body),
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}

def get_request(url):
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return resp.status, json.loads(resp.read().decode("utf-8"))
            return resp.status, resp.read()
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"detail": err_body}

def run_qa():
    print("\n" + "=" * 75)
    print("      FINAL QUALITY ASSURANCE & SYSTEM VALIDATION (SECRETPXEL)")
    print("=" * 75)

    # 1. Start Server
    print("\n[Stage 1] Launching Application Server (Uvicorn + FastAPI)...")
    config = uvicorn.Config(app=app, host=HOST, port=PORT, log_level="warning")
    server = uvicorn.Server(config)
    server_thread = threading.Thread(target=server.run, daemon=True)
    server_thread.start()

    time.sleep(1.0)

    passed_checks = 0
    total_checks = 7

    try:
        # Check 1: Frontend SPA static bundle delivery
        print("\n[Check 1/7] Web Application Delivery (GET /)...")
        status, html = get_request(f"{BASE_URL}/")
        html_str = html.decode("utf-8") if isinstance(html, bytes) else str(html)
        if status == 200 and "SecretPixel" in html_str and "assets" in html_str:
            print(f"  --> [PASS] React SPA index.html delivered successfully ({len(html_str)} bytes).")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Failed to serve frontend SPA: status {status}")

        # Check 2: Health check
        print("\n[Check 2/7] Health & C Core Operational Verification (GET /api/health)...")
        status, health = get_request(f"{BASE_URL}/api/health")
        if status == 200 and health.get("status") == "healthy" and health["c_backend"]["executable_operational"]:
            print(f"  --> [PASS] C Engine operational ({health['c_backend']['name']}).")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Health check degraded: {health}")

        # Check 3: BMP Metadata & Capacity Verification
        print("\n[Check 3/7] BMP Metadata & Capacity Parsing (POST /api/info)...")
        cover_sample_path = "samples/cyber_gradient_256.bmp"
        with open(cover_sample_path, "rb") as f:
            cover_bytes = f.read()

        status, info = post_multipart(
            f"{BASE_URL}/api/info",
            files={"image": ("cyber_gradient_256.bmp", cover_bytes, "image/bmp")}
        )
        if status == 200 and info.get("width") == 256 and info.get("max_capacity_bytes") == 24572:
            print(f"  --> [PASS] Image verified: 256x256, 24-bpp, max payload: {info['max_capacity_bytes']:,} bytes.")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Info inspection failed: {info}")

        # Check 4: Live Caesar Encryption & LSB Embedding
        print("\n[Check 4/7] Caesar Encryption & LSB Embedding (POST /api/embed)...")
        test_message = "FINAL QA VALIDATION: The SecretPixel system has achieved 100% operational fidelity in Caesar Cipher (k=3) & 24-bit BMP LSB Steganography!"
        status, embed_res = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": test_message},
            files={"image": ("cyber_gradient_256.bmp", cover_bytes, "image/bmp")}
        )
        
        expected_cipher_prefix = "ILQDO TD YDOLGDWLRQ:"
        ciphertext = embed_res.get("crypto", {}).get("ciphertext", "")
        psnr = embed_res.get("metrics", {}).get("psnr_db", 0)
        token = embed_res.get("download", {}).get("token")

        if (status == 200 and 
            ciphertext.startswith(expected_cipher_prefix) and 
            psnr > 60.0 and 
            token is not None):
            print(f"  --> [PASS] Caesar Cipher (k=3) applied: \"{ciphertext[:30]}...\"")
            print(f"             PSNR Score: {psnr:.2f} dB (High imperceptibility confirmed).")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Embedding verification failed: {embed_res}")

        # Check 5: Binary Image Download Verification
        print(f"\n[Check 5/7] Stego Binary Image Download (GET /api/download/{token})...")
        status, stego_binary = get_request(f"{BASE_URL}/api/download/{token}")
        if status == 200 and stego_binary.startswith(b"BM") and len(stego_binary) == len(cover_bytes):
            print(f"  --> [PASS] Downloaded stego BMP file ({len(stego_binary):,} bytes) matches 24-bit BMP specification.")
            with open("samples/downloaded_stego_qa.bmp", "wb") as f:
                f.write(stego_binary)
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Binary download corrupted or header mismatch: status {status}")

        # Check 6: Stego Extraction & Decryption Roundtrip
        print("\n[Check 6/7] Stego Extraction & Decryption (POST /api/extract)...")
        with open("samples/downloaded_stego_qa.bmp", "rb") as f:
            downloaded_bytes = f.read()

        status, extract_res = post_multipart(
            f"{BASE_URL}/api/extract",
            files={"image": ("downloaded_stego_qa.bmp", downloaded_bytes, "image/bmp")}
        )
        recovered_text = extract_res.get("decrypted_plaintext", "")
        if status == 200 and recovered_text == test_message:
            print(f"  --> [PASS] Decrypted message matches 100% byte-for-byte!")
            print(f"             Recovered: \"{recovered_text[:50]}...\"")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Extraction mismatch: {extract_res}")

        # Check 7: Robust Error Handling & Rejection
        print("\n[Check 7/7] Input Validation & Edge Case Rejection...")
        status, err_res = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": "fail"},
            files={"image": ("invalid.txt", b"This is plain text, not a BMP file", "text/plain")}
        )
        if status == 400 and "magic bytes 'BM'" in err_res.get("detail", ""):
            print("  --> [PASS] Correctly rejected non-BMP input with HTTP 400 Bad Request.")
            passed_checks += 1
        else:
            print(f"  --> [FAIL] Error handling failed to reject invalid file: {err_res}")

    finally:
        print("\n[Cleanup] Shutting down QA test server...")
        server.should_exit = True
        server_thread.join(timeout=2)
        print("  [OK] Server halted.")

    print("\n" + "=" * 75)
    print(f"   FINAL QA SCORE: {passed_checks} / {total_checks} CHECKS PASSED ({(passed_checks/total_checks)*100:.0f}%)")
    print("=" * 75 + "\n")

    return 0 if (passed_checks == total_checks) else 1

if __name__ == "__main__":
    sys.exit(run_qa())
