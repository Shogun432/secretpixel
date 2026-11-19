# SecretPixel API Gateway Documentation

The **SecretPixel API Gateway** is a high-performance REST bridge implemented in Python FastAPI. It connects web frontends to the native C core executable (`secretpixel.exe`) using isolated subprocess calls with strict security boundaries.

Interactive Swagger UI is available at: `http://localhost:8000/docs`  
ReDoc documentation is available at: `http://localhost:8000/redoc`

---

## Base URL
```
http://127.0.0.1:8000
```

---

## Authentication & Security
- **Authentication**: None required (local development & academic demo).
- **CORS**: Enabled for all origins (`*`) to allow direct frontend connection.
- **Process Isolation**: The C backend is invoked strictly via `subprocess.run(shell=False)` with arguments passed as an array, eliminating shell injection vulnerabilities.
- **File Safety**: Uploaded images are validated for the `BM` magic signature (0x4D42) and size-checked (max 50 MB) before processing inside unique temporary sandbox directories.

---

## Endpoints

### 1. System Health Check
Verifies whether the FastAPI server is running and the compiled C executable is present and operational.

* **URL**: `/api/health`
* **Method**: `GET`
* **Response `200 OK`**:
```json
{
  "status": "healthy",
  "api_version": "1.0.0",
  "c_backend": {
    "name": "SecretPixel C Core (ISO C99)",
    "executable_path": "C:\\Users\\...\\secretpixel.exe",
    "found": true,
    "size_bytes": 89375,
    "executable_operational": true
  },
  "system_time": "2026-11-19T16:55:00Z"
}
```

* **cURL Example**:
```bash
curl -X GET http://127.0.0.1:8000/api/health
```

---

### 2. Encrypt & Embed Message
Encrypts a plaintext message with Caesar Cipher ($k=3$) and embeds it into the LSBs of a 24-bit uncompressed BMP image using the C core.

* **URL**: `/api/embed`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  * `image` (binary, required): 24-bit uncompressed Windows BMP file.
  * `message` (string, required): Secret plaintext to hide.

* **Response `200 OK`**:
```json
{
  "status": "success",
  "operation": "embed",
  "image": {
    "width": 256,
    "height": 256,
    "max_capacity_bytes": 24572
  },
  "crypto": {
    "cipher": "Caesar Cipher",
    "shift_key": 3,
    "plaintext_length": 32,
    "ciphertext": "Vhfuhw Fdhvdu Phvvdjh 123!"
  },
  "metrics": {
    "modified_color_channels": 138,
    "mse": 0.000702,
    "psnr_db": 79.67,
    "quality_rating": "Imperceptible"
  },
  "download": {
    "token": "4f3b7d12a9e84b84a9e5b5c9d1234567",
    "download_url": "/api/download/4f3b7d12a9e84b84a9e5b5c9d1234567",
    "filename": "stego_cover.bmp"
  },
  "stego_image_data_uri": "data:image/bmp;base64,Qk0..."
}
```

* **cURL Example**:
```bash
curl -X POST http://127.0.0.1:8000/api/embed \
  -F "image=@cover.bmp" \
  -F "message=Secret Caesar Message 123!"
```

---

### 3. Extract & Decrypt Message
Extracts the LSB-embedded ciphertext and 32-bit length prefix from a stego BMP image, then decrypts it using the Caesar Cipher inverse shift ($k=-3$).

* **URL**: `/api/extract`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  * `image` (binary, required): 24-bit BMP stego image.

* **Response `200 OK`**:
```json
{
  "status": "success",
  "operation": "extract",
  "extracted_length": 32,
  "ciphertext": "Vhfuhw Fdhvdu Phvvdjh 123!",
  "caesar_shift_applied": -3,
  "decrypted_plaintext": "Secret Caesar Message 123!"
}
```

* **cURL Example**:
```bash
curl -X POST http://127.0.0.1:8000/api/extract \
  -F "image=@stego.bmp"
```

---

### 4. Inspect BMP Properties & Capacity
Inspects image dimensions, color depth, scanline row padding, and maximum payload capacity without modifying anything.

* **URL**: `/api/info`
* **Method**: `POST`
* **Content-Type**: `multipart/form-data`
* **Parameters**:
  * `image` (binary, required): BMP file to inspect.

* **Response `200 OK`**:
```json
{
  "status": "success",
  "operation": "info",
  "file": "temp.bmp",
  "width": 256,
  "height": 256,
  "bpp": 24,
  "planes": 1,
  "padding_per_row": 0,
  "row_stride": 768,
  "data_size": 196608,
  "max_capacity_bytes": 24572
}
```

---

### 5. Download Generated Stego Image
Streams the generated stego BMP image with an `attachment` download header.

* **URL**: `/api/download/{token}`
* **Method**: `GET`
* **Response**: Binary stream with `Content-Type: image/bmp`.

---

## HTTP Status Codes & Error Handling

| Status Code | Reason | Description |
| :--- | :--- | :--- |
| `200 OK` | Success | Operation completed successfully. |
| `400 Bad Request` | Validation Failure | Invalid file format, missing `'BM'` header, empty message, or message length exceeds image capacity. |
| `404 Not Found` | File Expired | Download token expired or does not exist. |
| `413 Payload Too Large` | File Too Big | Uploaded image exceeds 50 MB size limit. |
| `500 Server Error` | Backend Failure | Executable missing or C program crashed. |
| `504 Timeout` | Gateway Timeout | C backend processing exceeded 30-second execution limit. |
