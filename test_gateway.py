"""
Automated Test Runner for SecretPixel API Gateway
Tests all endpoints: /api/health, /api/embed, /api/extract, /api/info, and /api/download
"""

import base64
import json
import os
import subprocess
import sys
import threading
import time
import urllib.request
import urllib.parse
import uuid

import uvicorn
from server import app

SERVER_HOST = "127.0.0.1"
SERVER_PORT = 8000
BASE_URL = f"http://{SERVER_HOST}:{SERVER_PORT}"

def post_multipart(url, fields=None, files=None):
    """Encodes and sends a multipart/form-data POST request using standard urllib."""
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
    """Sends a GET request and returns (status_code, body_content)."""
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

def run_tests():
    print("\n" + "=" * 70)
    print("      SECRETPXEL FASTAPI GATEWAY END-TO-END TEST SUITE")
    print("=" * 70)

    # 1. Start server in a background thread
    print("\n[Step 1] Initializing and starting Uvicorn server in background thread...")
    config = uvicorn.Config(app=app, host=SERVER_HOST, port=SERVER_PORT, log_level="warning")
    server = uvicorn.Server(config)
    thread = threading.Thread(target=server.run, daemon=True)
    thread.start()

    # Wait for server to become responsive
    healthy = False
    for attempt in range(10):
        time.sleep(0.5)
        try:
            status_code, data = get_request(f"{BASE_URL}/api/health")
            if status_code == 200:
                healthy = True
                print(f"  [OK] Server responded: status={data.get('status')}")
                break
        except Exception:
            pass

    if not healthy:
        print("  [ERROR] Server failed to start within timeout.")
        server.should_exit = True
        sys.exit(1)

    passed_count = 0
    total_tests = 5

    try:
        # TEST 1: GET /api/health
        print("\n[Test 1/5] GET /api/health (Health & C Core Status)...")
        status_code, data = get_request(f"{BASE_URL}/api/health")
        print(f"  HTTP Status : {status_code}")
        print(f"  Response    : {json.dumps(data, indent=2)}")
        if status_code == 200 and data.get("status") == "healthy" and data["c_backend"]["executable_operational"]:
            print("  --> [PASS] Server is healthy and C executable is operational!")
            passed_count += 1
        else:
            print("  --> [FAIL] Health check failed.")

        # Ensure test BMP exists
        cover_path = "test_cover.bmp"
        if not os.path.exists(cover_path):
            subprocess.run(["secretpixel.exe", "test"], capture_output=True)

        with open(cover_path, "rb") as f:
            cover_bytes = f.read()

        # TEST 2: POST /api/embed
        print("\n[Test 2/5] POST /api/embed (Embed Secret Message)...")
        secret_message = "FastAPI Gateway Test: TopSecret 2026!"
        status_code, embed_data = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": secret_message},
            files={"image": ("test_cover.bmp", cover_bytes, "image/bmp")}
        )
        print(f"  HTTP Status      : {status_code}")
        print(f"  Plaintext Sent   : \"{secret_message}\"")
        print(f"  Ciphertext Made  : \"{embed_data.get('crypto', {}).get('ciphertext')}\"")
        print(f"  PSNR Score       : {embed_data.get('metrics', {}).get('psnr_db')} dB")
        print(f"  Download Token   : {embed_data.get('download', {}).get('token')}")

        download_token = embed_data.get("download", {}).get("token")
        data_uri = embed_data.get("stego_image_data_uri", "")

        if status_code == 200 and embed_data.get("status") == "success" and data_uri.startswith("data:image/bmp;base64,"):
            print("  --> [PASS] Message successfully encrypted and embedded into BMP!")
            passed_count += 1
        else:
            print(f"  --> [FAIL] Embedding failed: {embed_data}")

        # Extract raw stego bytes from base64
        base64_part = data_uri.split(",", 1)[1]
        stego_bytes = base64.b64decode(base64_part)

        # TEST 3: POST /api/extract
        print("\n[Test 3/5] POST /api/extract (Extract & Decrypt)...")
        status_code, extract_data = post_multipart(
            f"{BASE_URL}/api/extract",
            files={"image": ("stego.bmp", stego_bytes, "image/bmp")}
        )
        print(f"  HTTP Status       : {status_code}")
        print(f"  Extracted Cipher  : \"{extract_data.get('ciphertext')}\"")
        print(f"  Decrypted Message : \"{extract_data.get('decrypted_plaintext')}\"")

        if (status_code == 200 and
            extract_data.get("status") == "success" and
            extract_data.get("decrypted_plaintext") == secret_message):
            print("  --> [PASS] Decrypted message perfectly matches original plaintext!")
            passed_count += 1
        else:
            print(f"  --> [FAIL] Extraction failed: {extract_data}")

        # TEST 4: GET /api/download/{token}
        print(f"\n[Test 4/5] GET /api/download/{download_token} (Binary File Download)...")
        status_code, download_content = get_request(f"{BASE_URL}/api/download/{download_token}")
        print(f"  HTTP Status       : {status_code}")
        print(f"  Downloaded Bytes  : {len(download_content)} bytes")
        print(f"  Magic Bytes Check : {download_content[:2]}")

        if status_code == 200 and download_content.startswith(b"BM"):
            print("  --> [PASS] Stego BMP binary downloaded successfully with valid 'BM' magic header!")
            passed_count += 1
        else:
            print("  --> [FAIL] Stego binary download failed.")

        # TEST 5: Error Handling (Invalid file rejection)
        print("\n[Test 5/5] Error Validation (Reject Non-BMP Upload)...")
        fake_png = b"\x89PNG\r\n\x1a\nFake PNG content"
        status_code, err_data = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": "Should fail"},
            files={"image": ("fake.png", fake_png, "image/png")}
        )
        print(f"  HTTP Status : {status_code} (Expected 400 Bad Request)")
        print(f"  Error Detail: {err_data.get('detail')}")

        if status_code == 400 and "magic bytes 'BM'" in err_data.get("detail", ""):
            print("  --> [PASS] Correctly rejected non-BMP file with 400 Bad Request!")
            passed_count += 1
        else:
            print("  --> [FAIL] Error validation did not reject invalid file format.")

    finally:
        print("\n[Cleanup] Shutting down background server...")
        server.should_exit = True
        thread.join(timeout=3)
        print("  [OK] Server stopped.")

    print("\n" + "=" * 70)
    print(f"   API GATEWAY TEST RESULTS: {passed_count} / {total_tests} PASSED ({(passed_count/total_tests)*100:.0f}%)")
    print("=" * 70 + "\n")

    return 0 if (passed_count == total_tests) else 1

if __name__ == "__main__":
    sys.exit(run_tests())
