/**
 * @file steganography.h
 * @brief LSB (Least Significant Bit) Steganography Module for SecretPixel
 *
 * Implements spatial-domain LSB embedding and extraction for 24-bit BMP images:
 *  - Embeds encrypted message bits into RGB color channel LSBs.
 *  - Stores a 32-bit (4-byte) message length header before embedding payload.
 *  - Verifies image capacity against payload size before modification.
 *  - Preserves original cover image and returns a separate cloned stego-image.
 *  - Correctly skips BMP row padding bytes during bit read/write.
 */

#ifndef STEGANOGRAPHY_H
#define STEGANOGRAPHY_H

#include "bmp.h"
#include <stddef.h>
#include <stdbool.h>

/**
 * @brief Embeds an encrypted message into a 24-bit BMP image using LSB substitution.
 *
 * The original cover image is preserved intact. A new stego BMPImage is created and returned.
 *
 * Protocol:
 *  1. Checks if image capacity >= (32 bits for length + messageLen * 8 bits).
 *  2. Clones coverImage into a new stegoImage.
 *  3. Embeds 32-bit message length (Big-Endian) into the first 32 color channel LSBs.
 *  4. Embeds messageLen bytes into subsequent color channel LSBs (MSB to LSB).
 *  5. Row padding bytes at scanline boundaries are strictly skipped.
 *
 * @param coverImage Pointer to the original cover BMPImage (read-only).
 * @param message    Pointer to the encrypted message bytes.
 * @param messageLen Length of message in bytes.
 * @return Pointer to newly allocated stego BMPImage, or NULL if capacity exceeded or error.
 */
BMPImage* hideMessage(const BMPImage *coverImage, const char *message, size_t messageLen);

/**
 * @brief Extracts a hidden message from a 24-bit stego BMP image.
 *
 * Protocol:
 *  1. Reads the first 32 color channel LSBs to recover the 32-bit message length N.
 *  2. Validates N against maximum possible image capacity.
 *  3. Reads N * 8 subsequent color channel LSBs to reconstruct the ciphertext.
 *  4. Allocates and null-terminates a string buffer containing the extracted message.
 *  5. Row padding bytes at scanline boundaries are strictly skipped.
 *
 * @param stegoImage Pointer to the stego BMPImage.
 * @param outLen     Optional pointer to receive the extracted length in bytes (can be NULL).
 * @return Dynamically allocated null-terminated string, or NULL on error. Caller must free().
 */
char* extractMessage(const BMPImage *stegoImage, size_t *outLen);

#endif // STEGANOGRAPHY_H
