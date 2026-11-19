/**
 * @file bmp.h
 * @brief BMP Image Processing Module for SecretPixel
 *
 * Provides binary file I/O and validation for standard Windows 24-bit
 * uncompressed Bitmap (.bmp) files. Correctly handles:
 *  - 14-byte BITMAPFILEHEADER with 0x4D42 ('BM') magic identifier
 *  - 40-byte BITMAPINFOHEADER with 24-bit RGB and BI_RGB compression (0)
 *  - 4-byte row stride alignment and row padding
 *  - Coordinate orientation (positive height = bottom-up, negative = top-down)
 */

#ifndef BMP_H
#define BMP_H

#include <stdint.h>
#include <stdio.h>
#include <stdbool.h>
#include <stddef.h>

#define BMP_MAGIC 0x4D42 // 'B' 'M' in Little-Endian

// Force byte-level struct alignment (no compiler padding bytes)
#pragma pack(push, 1)

/**
 * @brief Windows BITMAPFILEHEADER (14 bytes)
 */
typedef struct {
    uint16_t bfType;          // Magic number: 0x4D42 ('BM')
    uint32_t bfSize;          // Total size of the file in bytes
    uint16_t bfReserved1;     // Reserved; must be 0
    uint16_t bfReserved2;     // Reserved; must be 0
    uint32_t bfOffBits;       // Offset from beginning of file to bitmap data
} BMPFileHeader;

/**
 * @brief Windows BITMAPINFOHEADER (40 bytes)
 */
typedef struct {
    uint32_t biSize;          // Header size in bytes (40)
    int32_t  biWidth;         // Image width in pixels
    int32_t  biHeight;        // Image height in pixels (positive = bottom-up)
    uint16_t biPlanes;        // Number of color planes (must be 1)
    uint16_t biBitCount;      // Bits per pixel (must be 24 for 24-bit RGB)
    uint32_t biCompression;   // Compression method (0 = BI_RGB, uncompressed)
    uint32_t biSizeImage;     // Size of the raw image data (can be 0 for BI_RGB)
    int32_t  biXPelsPerMeter; // Horizontal resolution (pixels/metre)
    int32_t  biYPelsPerMeter; // Vertical resolution (pixels/metre)
    uint32_t biClrUsed;       // Number of color indexes used (0 = max)
    uint32_t biClrImportant;  // Number of important colors (0 = all)
} BMPInfoHeader;

#pragma pack(pop)

/**
 * @brief In-memory representation of a 24-bit uncompressed BMP image.
 */
typedef struct {
    BMPFileHeader fileHeader;
    BMPInfoHeader infoHeader;
    int width;                // Image width in pixels
    int height;               // Image height in pixels (absolute value)
    int isTopDown;            // 1 if height was negative, 0 if standard bottom-up
    int padding;              // Number of padding bytes per row: (4 - (width * 3) % 4) % 4
    size_t rowStride;         // Total bytes per scanline: (width * 3) + padding
    size_t dataSize;          // Total size of pixelData buffer in bytes
    uint8_t *pixelData;       // Raw pixel buffer (including scanline padding)
} BMPImage;

/**
 * @brief Loads and parses a 24-bit uncompressed BMP image from file.
 *
 * Validates magic number ('BM'), bit depth (24-bit), and compression (BI_RGB).
 *
 * @param filename Path to input .bmp file.
 * @return Pointer to allocated BMPImage on success, NULL on failure.
 */
BMPImage* loadImage(const char *filename);

/**
 * @brief Writes an in-memory BMPImage to disk as a valid 24-bit BMP file.
 *
 * @param filename Path to destination .bmp file.
 * @param image    Pointer to BMPImage to save.
 * @return true on success, false on failure.
 */
bool saveImage(const char *filename, const BMPImage *image);

/**
 * @brief Creates an exact deep clone of a BMPImage.
 *
 * Ensures the original cover image is preserved unmodified when generating
 * a separate stego-image.
 *
 * @param src Pointer to source BMPImage.
 * @return Pointer to newly allocated clone BMPImage, or NULL on failure.
 */
BMPImage* cloneImage(const BMPImage *src);

/**
 * @brief Frees all memory associated with a BMPImage.
 *
 * @param image Pointer to BMPImage to free.
 */
void freeImage(BMPImage *image);

/**
 * @brief Calculates the maximum message capacity (in bytes) of an image.
 *
 * Formula: ((width * height * 3) / 8) - 4 bytes (for 32-bit length prefix).
 *
 * @param image Pointer to BMPImage.
 * @return Maximum embeddable message payload length in bytes.
 */
size_t getImageCapacity(const BMPImage *image);

#endif // BMP_H
