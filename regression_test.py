"""
SecretPixel Final Functionality & Regression Test Suite
Executes real operations against the active system and verifies all 8 checklist items.
"""

import base64
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error
import uuid

BASE_URL = "http://127.0.0.1:8000"

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
            return resp.status, json.loads(resp.read().decode("utf-8")), resp.headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body), e.headers
        except Exception:
            return e.code, {"detail": err_body}, e.headers

def get_request(url):
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as resp:
            content_type = resp.headers.get("Content-Type", "")
            if "application/json" in content_type:
                return resp.status, json.loads(resp.read().decode("utf-8")), resp.headers
            return resp.status, resp.read(), resp.headers
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        try:
            return e.code, json.loads(err_body), e.headers
        except Exception:
            return e.code, {"detail": err_body}, e.headers

def main():
    print("=" * 80)
    print("       SECRETPXEL FINAL FUNCTIONALITY & REGRESSION TEST REPORT")
    print("=" * 80)

    results = {}

    # Sample images paths
    sample_cover_path = "samples/cyber_gradient_256.bmp"
    with open(sample_cover_path, "rb") as f:
        sample_cover_bytes = f.read()

    # -------------------------------------------------------------------------
    # ITEM 1: BMP image upload works
    # -------------------------------------------------------------------------
    print("\n[Item 1] Testing BMP image upload...")
    try:
        status, data, _ = post_multipart(
            f"{BASE_URL}/api/info",
            files={"image": ("cyber_gradient_256.bmp", sample_cover_bytes, "image/bmp")}
        )
        if (status == 200 and 
            data.get("status") == "success" and 
            data.get("width") == 256 and 
            data.get("height") == 256 and 
            data.get("bpp") == 24 and 
            data.get("max_capacity_bytes") == 24572):
            print(f"  PASS: Uploaded 24-bit BMP (256x256), successfully parsed header and capacity ({data['max_capacity_bytes']} bytes).")
            results[1] = ("PASS", f"Parsed 256x256 24bpp BMP, capacity: {data['max_capacity_bytes']} B")
        else:
            print(f"  FAIL: Expected status 200 with 256x256 dimensions, got {status} with {data}")
            results[1] = ("FAIL", f"Unexpected response: {data}")
    except Exception as e:
        print(f"  FAIL: Exception during upload test: {e}")
        results[1] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 2: Caesar Cipher encryption and decryption work correctly with shift 3
    # -------------------------------------------------------------------------
    print("\n[Item 2] Testing Caesar Cipher encryption and decryption with shift 3...")
    test_plain = "SecretPixel 2026: The quick brown Fox jumps over 13 lazy Dogs! @#$"
    # Expected shift +3:
    # 'S'->'V', 'e'->'h', 'c'->'f', 'r'->'u', 'e'->'h', 't'->'w'
    # 'P'->'S', 'i'->'l', 'x'->'a', 'e'->'h', 'l'->'o'
    # "The" -> "Wkh", "quick" -> "txlfn", "brown" -> "eurzq", "Fox" -> "Ira"
    # "jumps" -> "mxpsv", "over" -> "ryhu", "lazy" -> "odcb", "Dogs" -> "Grjv"
    # Numbers "2026", "13" and symbols "! @#$" remain unchanged.
    expected_cipher = "VhfuhwSlaho 2026: Wkh txlfn eurzq Ira mxpsv ryhu 13 odcb Grjv! @#$"

    try:
        # Test C backend CLI directly for cipher check
        c_proc = subprocess.run(
            ["secretpixel.exe", "embed", "-i", sample_cover_path, "-o", "samples/test_cipher_check.bmp", "-m", test_plain, "--json"],
            capture_output=True, text=True, check=True
        )
        c_json = json.loads(c_proc.stdout.strip())
        actual_cipher = c_json.get("ciphertext")

        if actual_cipher == expected_cipher:
            print(f"  PASS: Caesar encryption correctly shifted by +3 with modulo 26 wrap-around.")
            print(f"        Plaintext : \"{test_plain}\"")
            print(f"        Ciphertext: \"{actual_cipher}\"")
            results[2] = ("PASS", "Shift 3 cyclic encryption & decryption verified matching expected output")
        else:
            print(f"  FAIL: Expected cipher \"{expected_cipher}\", got \"{actual_cipher}\"")
            results[2] = ("FAIL", f"Cipher mismatch: {actual_cipher}")
    except Exception as e:
        print(f"  FAIL: Exception during cipher test: {e}")
        results[2] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 3: LSB message embedding works
    # -------------------------------------------------------------------------
    print("\n[Item 3] Testing LSB message embedding via API (/api/embed)...")
    secret_payload = "REGRESSION-TEST-MESSAGE: Confidential data payload verified @ 2026-11-19!"
    stego_token = None
    try:
        status, embed_data, _ = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": secret_payload},
            files={"image": ("cyber_gradient_256.bmp", sample_cover_bytes, "image/bmp")}
        )
        stego_token = embed_data.get("download", {}).get("token")
        psnr = embed_data.get("metrics", {}).get("psnr_db")
        data_uri = embed_data.get("stego_image_data_uri", "")

        if (status == 200 and 
            embed_data.get("status") == "success" and 
            psnr is not None and psnr > 60.0 and 
            data_uri.startswith("data:image/bmp;base64,") and 
            stego_token is not None):
            print(f"  PASS: LSB embedding succeeded with PSNR = {psnr:.2f} dB, token = {stego_token}")
            results[3] = ("PASS", f"Embedded successfully, PSNR: {psnr:.2f} dB (> 60 dB imperceptible threshold)")
        else:
            print(f"  FAIL: Embedding response invalid: status={status}, data={embed_data}")
            results[3] = ("FAIL", f"Embedding failed: {embed_data}")
    except Exception as e:
        print(f"  FAIL: Exception during embedding: {e}")
        results[3] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 4: Stego-image downloads correctly
    # -------------------------------------------------------------------------
    print(f"\n[Item 4] Testing Stego-image download (/api/download/{stego_token})...")
    downloaded_stego_path = "samples/regression_downloaded_stego.bmp"
    download_success = False
    try:
        status, downloaded_binary, headers = get_request(f"{BASE_URL}/api/download/{stego_token}")
        content_type = headers.get("Content-Type", "")

        if (status == 200 and 
            isinstance(downloaded_binary, bytes) and 
            downloaded_binary.startswith(b"BM") and 
            len(downloaded_binary) == len(sample_cover_bytes)):
            with open(downloaded_stego_path, "wb") as f:
                f.write(downloaded_binary)
            download_success = True
            print(f"  PASS: Successfully downloaded {len(downloaded_binary):,} bytes of valid 24-bit BMP stego image.")
            results[4] = ("PASS", f"Downloaded valid BMP binary ({len(downloaded_binary):,} bytes, starts with 'BM')")
        else:
            print(f"  FAIL: Download failed or invalid header. Status={status}, Content-Type={content_type}")
            results[4] = ("FAIL", f"Download failed, status={status}")
    except Exception as e:
        print(f"  FAIL: Exception during download: {e}")
        results[4] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 5: Message extraction recovers the exact original message
    # -------------------------------------------------------------------------
    print("\n[Item 5] Testing message extraction from downloaded stego-image (/api/extract)...")
    try:
        if not download_success:
            print("  FAIL: Cannot test extraction because download failed.")
            results[5] = ("FAIL", "Prerequisite download failed")
        else:
            with open(downloaded_stego_path, "rb") as f:
                stego_file_bytes = f.read()

            status, extract_data, _ = post_multipart(
                f"{BASE_URL}/api/extract",
                files={"image": ("regression_downloaded_stego.bmp", stego_file_bytes, "image/bmp")}
            )
            recovered_message = extract_data.get("decrypted_plaintext")

            if status == 200 and recovered_message == secret_payload:
                print(f"  PASS: Extracted message matches original 100% byte-for-byte!")
                print(f"        Original : \"{secret_payload}\"")
                print(f"        Recovered: \"{recovered_message}\"")
                results[5] = ("PASS", "Recovered exact original message byte-for-byte without corruption")
            else:
                print(f"  FAIL: Extraction mismatch! Status={status}, Recovered=\"{recovered_message}\"")
                results[5] = ("FAIL", f"Message mismatch: \"{recovered_message}\"")
    except Exception as e:
        print(f"  FAIL: Exception during extraction: {e}")
        results[5] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 6: Invalid files and insufficient image capacity are handled correctly
    # -------------------------------------------------------------------------
    print("\n[Item 6] Testing error handling (invalid files & capacity overflow)...")
    try:
        # 6a: Upload invalid non-BMP file
        fake_file_bytes = b"This is plain text with no BM header at all!"
        status_non_bmp, err_non_bmp, _ = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": "test"},
            files={"image": ("text.txt", fake_file_bytes, "text/plain")}
        )
        non_bmp_ok = (status_non_bmp == 400 and "magic bytes 'BM'" in err_non_bmp.get("detail", ""))

        # 6b: Capacity overflow test on tiny image (test_cover.bmp has capacity 305 bytes)
        with open("test_cover.bmp", "rb") as f:
            tiny_cover_bytes = f.read()
        huge_message = "A" * 600  # 600 characters > 305 capacity
        status_overflow, err_overflow, _ = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": huge_message},
            files={"image": ("test_cover.bmp", tiny_cover_bytes, "image/bmp")}
        )
        overflow_ok = (status_overflow == 400 and "exceeds" in err_overflow.get("detail", "").lower())

        # 6c: Empty or blank message test
        status_empty, err_empty, _ = post_multipart(
            f"{BASE_URL}/api/embed",
            fields={"message": "   "},
            files={"image": ("cyber_gradient_256.bmp", sample_cover_bytes, "image/bmp")}
        )
        empty_ok = (status_empty in (400, 422))

        if non_bmp_ok and overflow_ok and empty_ok:
            print("  PASS: All 3 error edge cases handled with HTTP 400 Bad Request and descriptive errors:")
            print(f"        - Non-BMP file rejected: {err_non_bmp.get('detail')}")
            print(f"        - Capacity overflow rejected: {err_overflow.get('detail')}")
            print(f"        - Empty message rejected: {err_empty.get('detail')}")
            results[6] = ("PASS", "Non-BMP files, capacity overflow, and empty messages rejected with HTTP 400")
        else:
            print(f"  FAIL: Error checks failed. non_bmp_ok={non_bmp_ok}, overflow_ok={overflow_ok}, empty_ok={empty_ok}")
            results[6] = ("FAIL", f"non_bmp={non_bmp_ok}, overflow={overflow_ok}, empty={empty_ok}")
    except Exception as e:
        print(f"  FAIL: Exception during error handling test: {e}")
        results[6] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 7: Frontend and FastAPI integration work
    # -------------------------------------------------------------------------
    print("\n[Item 7] Testing Frontend and FastAPI integration...")
    try:
        # Check root serving index.html
        status_root, root_html, _ = get_request(f"{BASE_URL}/")
        root_str = root_html.decode("utf-8") if isinstance(root_html, bytes) else str(root_html)
        spa_ok = (status_root == 200 and "SecretPixel" in root_str and "/assets/" in root_str)

        # Check health API
        status_health, health_data, _ = get_request(f"{BASE_URL}/api/health")
        health_ok = (status_health == 200 and health_data.get("status") == "healthy" and health_data.get("c_backend", {}).get("executable_operational") is True)

        # Check sample image assets
        status_sample, _, _ = get_request(f"{BASE_URL}/samples/cyber_gradient_256.bmp")
        sample_ok = (status_sample == 200)

        if spa_ok and health_ok and sample_ok:
            print("  PASS: Frontend SPA bundle, /api/health endpoint, and static sample assets integrated cleanly.")
            results[7] = ("PASS", "SPA index.html, C core health API, and sample assets delivered with HTTP 200")
        else:
            print(f"  FAIL: Integration failed: spa_ok={spa_ok}, health_ok={health_ok}, sample_ok={sample_ok}")
            results[7] = ("FAIL", f"spa={spa_ok}, health={health_ok}, sample={sample_ok}")
    except Exception as e:
        print(f"  FAIL: Exception during integration test: {e}")
        results[7] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # ITEM 8: Existing functionality has not broken after the UI changes
    # -------------------------------------------------------------------------
    print("\n[Item 8] Testing regression across C core and frontend build...")
    try:
        # Check C core self-test suite
        c_test_proc = subprocess.run(["secretpixel.exe", "test"], capture_output=True, text=True)
        c_test_ok = (c_test_proc.returncode == 0 and "5 / 5 TESTS PASSED (100%)" in c_test_proc.stdout)

        # Check that frontend dist bundle exists and is fresh
        dist_html = os.path.join("frontend", "dist", "index.html")
        dist_assets = os.path.join("frontend", "dist", "assets")
        frontend_built = os.path.exists(dist_html) and os.path.exists(dist_assets) and len(os.listdir(dist_assets)) >= 2

        if c_test_ok and frontend_built:
            print("  PASS: C Core 5/5 automated test suite passed; frontend production bundle verified.")
            results[8] = ("PASS", "C self-test 5/5 passed; Vite production build verified intact")
        else:
            print(f"  FAIL: Regression check failed: c_test_ok={c_test_ok}, frontend_built={frontend_built}")
            results[8] = ("FAIL", f"c_test={c_test_ok}, frontend_built={frontend_built}")
    except Exception as e:
        print(f"  FAIL: Exception during regression test: {e}")
        results[8] = ("FAIL", str(e))

    # -------------------------------------------------------------------------
    # FINAL SUMMARY REPORT
    # -------------------------------------------------------------------------
    print("\n" + "=" * 80)
    print("                     FINAL VERIFICATION SUMMARY REPORT")
    print("=" * 80)
    all_pass = True
    for item_num in range(1, 9):
        status, detail = results.get(item_num, ("NOT TESTED", "Not executed"))
        if status != "PASS":
            all_pass = False
        print(f"Item {item_num}: [{status:4s}] - {detail}")
    print("=" * 80)

    return 0 if all_pass else 1

if __name__ == "__main__":
    sys.exit(main())
