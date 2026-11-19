# =============================================================================
# SecretPixel Production Dockerfile for Render Deployment
# =============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install GCC compiler and development libraries for building the native C engine
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libc6-dev \
    make \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies first for optimal Docker layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend source code, C engine files, and sample assets
COPY server.py .
COPY main.c caesar.c caesar.h bmp.c bmp.h steganography.c steganography.h Makefile ./
COPY samples/ ./samples/

# Compile the C engine binary natively on Linux with optimization
RUN gcc -Wall -Wextra -std=c99 -O2 main.c caesar.c bmp.c steganography.c -o secretpixel -lm && \
    chmod +x secretpixel && \
    ./secretpixel test

# Set production environment defaults for Render
ENV PORT=8000
ENV HOST=0.0.0.0
ENV SECRETPXEL_BIN=/app/secretpixel

EXPOSE 8000

# Start Uvicorn production server
CMD ["python", "server.py"]
