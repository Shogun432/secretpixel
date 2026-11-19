"""
SecretPixel API Gateway
========================
High-performance Python FastAPI bridge connecting the SecretPixel C backend
(secretpixel.exe) to modern web clients.

Key Features:
- Subprocess isolation with strict shell=False to prevent command injection.
- Temporary sandbox directories for processing uploaded BMP images.
- Header validation (0x4D42 'BM' magic bytes) and file size safeguards.
- Full CORS support for local web frontend development.
- Base64 data streaming and direct binary download support.
"""

import base64
import json
import logging
import os
from pathlib import Path
import subprocess
import tempfile
import time
import uuid
from typing import Dict, Optional

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel

# -----------------------------------------------------------------------------
# Configuration & Constants
# -----------------------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
MAX_UPLOAD_SIZE_BYTES = 50 * 1024 * 1024  # 50 MB
BMP_MAGIC_BYTES = b"BM"  # 0x42 0x4D in ASCII

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("SecretPixelGateway")

def resolve_executable_path() -> Path:
    """
    Resolves the C core binary path cross-platform (Linux/Render vs. Windows).
    Supports environment variable SECRETPXEL_BIN, detects Linux 'secretpixel',
    Windows 'secretpixel.exe', and auto-compiles if GCC is available on Linux.
    """
    env_path = os.getenv("SECRETPXEL_BIN")
    if env_path and Path(env_path).exists():
        logger.info(f"Using executable from SECRETPXEL_BIN: {env_path}")
        return Path(env_path)

    # 1. Check for Linux binary
    linux_bin = BASE_DIR / "secretpixel"
    if linux_bin.exists():
        return linux_bin

    # 2. Check for Windows binary
    win_bin = BASE_DIR / "secretpixel.exe"
    if win_bin.exists():
        return win_bin

    # 3. Auto-compile fallback if gcc exists
    target_bin = BASE_DIR / ("secretpixel.exe" if os.name == "nt" else "secretpixel")
    logger.warning(f"C core executable not found. Attempting auto-compilation to '{target_bin}'...")
    try:
        compile_cmd = [
            "gcc", "-Wall", "-Wextra", "-std=c99", "-O2",
            str(BASE_DIR / "main.c"),
            str(BASE_DIR / "caesar.c"),
            str(BASE_DIR / "bmp.c"),
            str(BASE_DIR / "steganography.c"),
            "-o", str(target_bin),
            "-lm"
        ]
        res = subprocess.run(compile_cmd, capture_output=True, text=True, check=True)
        if target_bin.exists():
            if os.name != "nt":
                target_bin.chmod(0o755)
            logger.info("Auto-compilation succeeded!")
            return target_bin
    except Exception as e:
        logger.error(f"Auto-compilation failed: {e}")

    return target_bin

EXECUTABLE_PATH = resolve_executable_path()

# In-memory storage for generated stego files available for binary download
# Token -> {"path": str, "expires_at": float, "filename": str}
DOWNLOAD_CACHE: Dict[str, dict] = {}
DOWNLOAD_TTL_SECONDS = 1800  # 30 minutes

app = FastAPI(
    title="SecretPixel API Gateway",
    description="REST API connecting SecretPixel C Core (Caesar Cipher & LSB Steganography) to web clients.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS: allows configurable origins via ALLOWED_ORIGINS env var
# Default to "*" if not specified for local development and initial deployments.
raw_origins = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [o.strip() for o in raw_origins.split(",") if o.strip()]
if not allowed_origins or "*" in allowed_origins:
    allowed_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# Helper Utilities
# -----------------------------------------------------------------------------
def cleanup_download_cache():
    """Removes expired files from the temporary download cache."""
    now = time.time()
    expired_keys = [k for k, v in DOWNLOAD_CACHE.items() if v["expires_at"] < now]
    for k in expired_keys:
        try:
            entry = DOWNLOAD_CACHE.pop(k, None)
            if entry and os.path.exists(entry["path"]):
                os.remove(entry["path"])
        except Exception as e:
            logger.warning(f"Failed to delete expired cache file: {e}")

async def validate_and_read_bmp(file: UploadFile) -> bytes:
    """
    Validates uploaded file size and BMP magic bytes ('BM' / 0x4D42).
    Returns raw file content bytes.
    """
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty."
        )

    if len(content) > MAX_UPLOAD_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds maximum allowed size of {MAX_UPLOAD_SIZE_BYTES // (1024 * 1024)} MB."
        )

    if not content.startswith(BMP_MAGIC_BYTES):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid image format. Only uncompressed 24-bit Windows BMP (.bmp) files starting with magic bytes 'BM' are accepted."
        )

    return content

def execute_c_core(args: list[str]) -> dict:
    """
    Safely executes the C binary (secretpixel.exe) via subprocess with shell=False.
    Parses and returns structured JSON output from stdout.
    """
    if not EXECUTABLE_PATH.exists():
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"C core executable not found at '{EXECUTABLE_PATH}'. Please compile the backend first."
        )

    command = [str(EXECUTABLE_PATH)] + args
    logger.info(f"Executing: {' '.join(command)}")

    try:
        process = subprocess.run(
            command,
            capture_output=True,
            text=True,
            shell=False,
            timeout=30
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="C backend execution timed out (limit: 30 seconds)."
        )
    except Exception as e:
        logger.error(f"Failed to spawn C core process: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute C backend: {str(e)}"
        )

    stdout = process.stdout.strip()
    stderr = process.stderr.strip()

    # Attempt to parse JSON response from C backend
    try:
        result = json.loads(stdout)
    except json.JSONDecodeError:
        # If output was not JSON, construct error or fallback
        if process.returncode != 0:
            error_message = stderr or stdout or "Unknown error occurred in C backend."
            logger.error(f"C core exited with code {process.returncode}: {error_message}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=error_message
            )
        result = {"status": "success", "raw_output": stdout}

    if process.returncode != 0:
        error_msg = result.get("message", stderr or "C core execution failed.")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )

    return result

# -----------------------------------------------------------------------------
# Endpoints
# -----------------------------------------------------------------------------
@app.get("/api/health", summary="System Health & C Executable Check")
async def health_check():
    """
    Verifies that the FastAPI server is running and the compiled C executable
    (secretpixel.exe) is present and functioning.
    """
    exe_exists = EXECUTABLE_PATH.exists()
    exe_size = EXECUTABLE_PATH.stat().st_size if exe_exists else 0

    c_version_check = False
    if exe_exists:
        try:
            res = subprocess.run(
                [str(EXECUTABLE_PATH)],
                capture_output=True,
                text=True,
                shell=False,
                timeout=5
            )
            c_version_check = (res.returncode == 0)
        except Exception:
            c_version_check = False

    return {
        "status": "healthy" if (exe_exists and c_version_check) else "degraded",
        "api_version": "1.0.0",
        "c_backend": {
            "name": "SecretPixel C Core (ISO C99)",
            "executable_path": str(EXECUTABLE_PATH),
            "found": exe_exists,
            "size_bytes": exe_size,
            "executable_operational": c_version_check
        },
        "system_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

@app.post("/api/embed", summary="Encrypt & Embed Secret Message into BMP")
async def embed_message(
    image: UploadFile = File(..., description="24-bit uncompressed BMP cover image"),
    message: str = Form(..., description="Secret plaintext message to encrypt and embed")
):
    """
    Accepts a 24-bit uncompressed BMP image and a plaintext secret message.
    1. Validates file header and payload capacity.
    2. Encrypts message using Caesar Cipher (shift = 3).
    3. Embeds encrypted bits into pixel LSBs using the C backend.
    4. Computes image quality metrics (MSE & PSNR).
    5. Returns JSON metadata, base64-encoded stego image, and a direct download link.
    """
    cleanup_download_cache()

    if not message.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Secret message cannot be empty or blank."
        )

    image_bytes = await validate_and_read_bmp(image)

    # Use an isolated temporary directory for file processing
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        input_bmp_path = temp_dir_path / f"cover_{uuid.uuid4().hex[:8]}.bmp"
        output_bmp_path = temp_dir_path / f"stego_{uuid.uuid4().hex[:8]}.bmp"

        # Write uploaded image safely to temporary file
        input_bmp_path.write_bytes(image_bytes)

        # Call C backend embed command
        args = [
            "embed",
            "-i", str(input_bmp_path),
            "-o", str(output_bmp_path),
            "-m", message,
            "--json"
        ]
        result = execute_c_core(args)

        if not output_bmp_path.exists():
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="C core succeeded but stego image was not created."
            )

        stego_bytes = output_bmp_path.read_bytes()
        base64_stego = base64.b64encode(stego_bytes).decode("ascii")
        data_uri = f"data:image/bmp;base64,{base64_stego}"

        # Persist a temporary copy for direct binary file download
        token = uuid.uuid4().hex
        persistent_temp = Path(tempfile.gettempdir()) / f"secretpixel_{token}.bmp"
        persistent_temp.write_bytes(stego_bytes)

        DOWNLOAD_CACHE[token] = {
            "path": str(persistent_temp),
            "expires_at": time.time() + DOWNLOAD_TTL_SECONDS,
            "filename": f"stego_{Path(image.filename or 'image').stem}.bmp"
        }

    return {
        "status": "success",
        "operation": "embed",
        "image": {
            "width": result.get("width"),
            "height": result.get("height"),
            "max_capacity_bytes": result.get("capacity"),
        },
        "crypto": {
            "cipher": "Caesar Cipher",
            "shift_key": result.get("caesar_shift", 3),
            "plaintext_length": result.get("message_len"),
            "ciphertext": result.get("ciphertext")
        },
        "metrics": {
            "modified_color_channels": result.get("modified_channels"),
            "mse": result.get("mse"),
            "psnr_db": result.get("psnr_db"),
            "quality_rating": "Imperceptible" if (result.get("psnr_db", 0) >= 50) else "Noticeable"
        },
        "download": {
            "token": token,
            "download_url": f"/api/download/{token}",
            "filename": DOWNLOAD_CACHE[token]["filename"]
        },
        "stego_image_data_uri": data_uri
    }

@app.post("/api/extract", summary="Extract & Decrypt Secret Message from Stego BMP")
async def extract_message(
    image: UploadFile = File(..., description="24-bit BMP stego image containing secret message")
):
    """
    Accepts a 24-bit BMP stego image.
    1. Validates BMP magic bytes.
    2. Executes C backend to extract LSB-encoded ciphertext and 32-bit length prefix.
    3. Decrypts ciphertext using Caesar Cipher (shift = -3).
    4. Returns the decrypted secret message and ciphertext.
    """
    image_bytes = await validate_and_read_bmp(image)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        stego_path = temp_dir_path / f"stego_in_{uuid.uuid4().hex[:8]}.bmp"
        stego_path.write_bytes(image_bytes)

        # Call C backend extract command
        args = [
            "extract",
            "-i", str(stego_path),
            "--json"
        ]
        result = execute_c_core(args)

    return {
        "status": "success",
        "operation": "extract",
        "extracted_length": result.get("length"),
        "ciphertext": result.get("ciphertext"),
        "caesar_shift_applied": -3,
        "decrypted_plaintext": result.get("decrypted_plaintext")
    }

@app.post("/api/info", summary="Inspect BMP Metadata & Steganographic Capacity")
async def inspect_bmp(
    image: UploadFile = File(..., description="BMP image to inspect")
):
    """
    Inspects BMP dimensions, bit depth, row padding, and maximum payload capacity.
    Useful for the frontend to render real-time capacity meters.
    """
    image_bytes = await validate_and_read_bmp(image)

    with tempfile.TemporaryDirectory() as temp_dir:
        temp_dir_path = Path(temp_dir)
        img_path = temp_dir_path / f"inspect_{uuid.uuid4().hex[:8]}.bmp"
        img_path.write_bytes(image_bytes)

        args = ["info", "-i", str(img_path), "--json"]
        result = execute_c_core(args)

    return result

@app.get("/api/download/{token}", summary="Download Generated Stego BMP File")
async def download_stego_file(token: str):
    """
    Streams the generated stego BMP image with Content-Disposition attachment.
    """
    cleanup_download_cache()
    entry = DOWNLOAD_CACHE.get(token)

    if not entry or not os.path.exists(entry["path"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Requested stego image download has expired or does not exist."
        )

    return FileResponse(
        path=entry["path"],
        media_type="image/bmp",
        filename=entry["filename"]
    )

# -----------------------------------------------------------------------------
# Static Files & Frontend Serving (Production Bundle)
# -----------------------------------------------------------------------------
from fastapi.staticfiles import StaticFiles

FRONTEND_DIST = BASE_DIR / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIST), html=True), name="frontend")

# -----------------------------------------------------------------------------
# Standalone Server Runner
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    host = os.getenv("HOST", "0.0.0.0")
    logger.info(f"Starting SecretPixel API Gateway on http://{host}:{port}")
    uvicorn.run("server:app", host=host, port=port, reload=False)
