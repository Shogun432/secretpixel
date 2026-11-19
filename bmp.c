/**
 * @file bmp.c
 * @brief Implementation of 24-bit uncompressed BMP image loading, saving, and validation.
 *
 * Technical Details:
 * - BMP format stores pixel color channels in BGR (Blue, Green, Red) byte order.
 * - Each row is aligned to a 4-byte boundary. Padding bytes (0-3 bytes) are appended
 *   to each row if (width * 3) is not a multiple of 4.
 * - Negative height indicates top-down pixel storage; positive indicates bottom-up.
 */

#include "bmp.h"
#include <stdlib.h>
#include <string.h>

BMPImage* loadImage(const char *filename) {
    if (filename == NULL) {
        fprintf(stderr, "[Error] loadImage: NULL filename provided.\n");
        return NULL;
    }

    FILE *fp = fopen(filename, "rb");
    if (fp == NULL) {
        fprintf(stderr, "[Error] loadImage: Unable to open file '%s'.\n", filename);
        return NULL;
    }

    // Allocate memory for BMPImage structure
    BMPImage *image = (BMPImage*)calloc(1, sizeof(BMPImage));
    if (image == NULL) {
        fprintf(stderr, "[Error] loadImage: Memory allocation failed for BMPImage.\n");
        fclose(fp);
        return NULL;
    }

    // Read BITMAPFILEHEADER (14 bytes)
    if (fread(&image->fileHeader, sizeof(BMPFileHeader), 1, fp) != 1) {
        fprintf(stderr, "[Error] loadImage: Failed to read BITMAPFILEHEADER from '%s'.\n", filename);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Validate BMP Magic Bytes ('BM' = 0x4D42)
    if (image->fileHeader.bfType != BMP_MAGIC) {
        fprintf(stderr, "[Error] loadImage: Invalid BMP file. Magic bytes 0x%04X != 0x%04X ('BM').\n",
                image->fileHeader.bfType, BMP_MAGIC);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Read BITMAPINFOHEADER (40 bytes)
    if (fread(&image->infoHeader, sizeof(BMPInfoHeader), 1, fp) != 1) {
        fprintf(stderr, "[Error] loadImage: Failed to read BITMAPINFOHEADER from '%s'.\n", filename);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Validate 24-bit uncompressed format
    if (image->infoHeader.biBitCount != 24) {
        fprintf(stderr, "[Error] loadImage: Unsupported bit depth (%d bpp). Only 24-bit RGB BMPs are supported.\n",
                image->infoHeader.biBitCount);
        free(image);
        fclose(fp);
        return NULL;
    }

    if (image->infoHeader.biCompression != 0) { // 0 = BI_RGB (uncompressed)
        fprintf(stderr, "[Error] loadImage: Compressed BMP format (%u) not supported. Only uncompressed BI_RGB is supported.\n",
                image->infoHeader.biCompression);
        free(image);
        fclose(fp);
        return NULL;
    }

    if (image->infoHeader.biPlanes != 1) {
        fprintf(stderr, "[Error] loadImage: Invalid planes count (%u). Must be 1.\n", image->infoHeader.biPlanes);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Determine dimensions and coordinate orientation
    image->width = image->infoHeader.biWidth;
    int32_t rawHeight = image->infoHeader.biHeight;

    if (image->width <= 0 || rawHeight == 0) {
        fprintf(stderr, "[Error] loadImage: Invalid image dimensions (%dx%d).\n", image->width, rawHeight);
        free(image);
        fclose(fp);
        return NULL;
    }

    if (rawHeight < 0) {
        image->height = -rawHeight;
        image->isTopDown = 1;
    } else {
        image->height = rawHeight;
        image->isTopDown = 0;
    }

    // Calculate row padding: each row must be aligned to a multiple of 4 bytes
    image->padding = (4 - ((image->width * 3) % 4)) % 4;
    image->rowStride = (size_t)(image->width * 3 + image->padding);
    image->dataSize = image->rowStride * (size_t)image->height;

    // Allocate buffer for pixel data (including row padding)
    image->pixelData = (uint8_t*)malloc(image->dataSize);
    if (image->pixelData == NULL) {
        fprintf(stderr, "[Error] loadImage: Failed to allocate %zu bytes for pixel data.\n", image->dataSize);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Seek to pixel data offset as specified in file header (typically 54)
    if (fseek(fp, (long)image->fileHeader.bfOffBits, SEEK_SET) != 0) {
        fprintf(stderr, "[Error] loadImage: Failed to seek to pixel offset %u.\n", image->fileHeader.bfOffBits);
        free(image->pixelData);
        free(image);
        fclose(fp);
        return NULL;
    }

    // Read all pixel data
    size_t bytesRead = fread(image->pixelData, 1, image->dataSize, fp);
    if (bytesRead < image->dataSize) {
        fprintf(stderr, "[Warning] loadImage: Read %zu bytes, expected %zu bytes. File may be truncated.\n",
                bytesRead, image->dataSize);
    }

    fclose(fp);
    return image;
}

bool saveImage(const char *filename, const BMPImage *image) {
    if (filename == NULL || image == NULL || image->pixelData == NULL) {
        fprintf(stderr, "[Error] saveImage: Invalid parameters or NULL image.\n");
        return false;
    }

    FILE *fp = fopen(filename, "wb");
    if (fp == NULL) {
        fprintf(stderr, "[Error] saveImage: Could not open file '%s' for writing.\n", filename);
        return false;
    }

    // Prepare headers
    BMPFileHeader fileHeader = image->fileHeader;
    BMPInfoHeader infoHeader = image->infoHeader;

    // Ensure headers correctly reflect sizes and offsets
    fileHeader.bfType = BMP_MAGIC;
    fileHeader.bfOffBits = sizeof(BMPFileHeader) + sizeof(BMPInfoHeader); // 54
    fileHeader.bfSize = fileHeader.bfOffBits + (uint32_t)image->dataSize;
    fileHeader.bfReserved1 = 0;
    fileHeader.bfReserved2 = 0;

    infoHeader.biSize = sizeof(BMPInfoHeader); // 40
    infoHeader.biWidth = image->width;
    infoHeader.biHeight = image->isTopDown ? -image->height : image->height;
    infoHeader.biPlanes = 1;
    infoHeader.biBitCount = 24;
    infoHeader.biCompression = 0; // BI_RGB
    infoHeader.biSizeImage = (uint32_t)image->dataSize;

    // Write headers
    if (fwrite(&fileHeader, sizeof(BMPFileHeader), 1, fp) != 1 ||
        fwrite(&infoHeader, sizeof(BMPInfoHeader), 1, fp) != 1) {
        fprintf(stderr, "[Error] saveImage: Failed to write BMP headers to '%s'.\n", filename);
        fclose(fp);
        return false;
    }

    // Write pixel data
    size_t written = fwrite(image->pixelData, 1, image->dataSize, fp);
    if (written != image->dataSize) {
        fprintf(stderr, "[Error] saveImage: Wrote %zu of %zu pixel bytes to '%s'.\n", written, image->dataSize, filename);
        fclose(fp);
        return false;
    }

    fclose(fp);
    return true;
}

BMPImage* cloneImage(const BMPImage *src) {
    if (src == NULL || src->pixelData == NULL) {
        return NULL;
    }

    BMPImage *dst = (BMPImage*)malloc(sizeof(BMPImage));
    if (dst == NULL) {
        fprintf(stderr, "[Error] cloneImage: Memory allocation failed.\n");
        return NULL;
    }

    // Copy metadata and headers
    *dst = *src;

    // Allocate separate pixel buffer for the clone
    dst->pixelData = (uint8_t*)malloc(src->dataSize);
    if (dst->pixelData == NULL) {
        fprintf(stderr, "[Error] cloneImage: Failed to allocate %zu bytes for cloned pixel data.\n", src->dataSize);
        free(dst);
        return NULL;
    }

    memcpy(dst->pixelData, src->pixelData, src->dataSize);
    return dst;
}

void freeImage(BMPImage *image) {
    if (image != NULL) {
        if (image->pixelData != NULL) {
            free(image->pixelData);
            image->pixelData = NULL;
        }
        free(image);
    }
}

size_t getImageCapacity(const BMPImage *image) {
    if (image == NULL) {
        return 0;
    }

    // Each pixel has 3 color channels (Blue, Green, Red)
    // In 1-bit LSB steganography, 1 byte of payload requires 8 color channels (8 pixels/channels).
    size_t totalColorChannels = (size_t)image->width * (size_t)image->height * 3;
    
    // We reserve 32 bits (32 color channels = 4 bytes) for storing message length prefix
    if (totalColorChannels < 32) {
        return 0;
    }

    size_t availableBits = totalColorChannels - 32;
    return availableBits / 8; // Max payload length in bytes
}
