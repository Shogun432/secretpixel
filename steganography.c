/**
 * @file steganography.c
 * @brief Implementation of spatial LSB steganography for 24-bit BMP images.
 *
 * Algorithm Details:
 * 1. Pixel Bit Insertion:
 *    To insert a single secret bit b in {0, 1} into a color channel byte C:
 *      C' = (C & ~1) | (b & 1)
 *    Bitwise operation (C & 0xFE) clears the least significant bit,
 *    and | (b & 1) sets the LSB to the target bit without altering the
 *    other 7 higher-order bits. The visual difference (+-1 intensity) is imperceptible.
 *
 * 2. Pixel Bit Extraction:
 *    To extract the hidden bit from stego color channel byte C':
 *      b = C' & 1
 *    Reconstruct bytes by left-shifting accumulator:
 *      byte_val = (byte_val << 1) | b
 *
 * 3. BMP Row Padding Handling:
 *    A 24-bit BMP aligns each row to a 4-byte boundary with 0-3 padding bytes.
 *    Embedding and extraction sequentially scan only valid RGB channels
 *    (0 to width * 3 - 1) and skip row padding bytes to preserve file integrity.
 */

#include "steganography.h"
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

BMPImage* hideMessage(const BMPImage *coverImage, const char *message, size_t messageLen) {
    if (coverImage == NULL || coverImage->pixelData == NULL) {
        fprintf(stderr, "[Error] hideMessage: Invalid cover image.\n");
        return NULL;
    }

    if (message == NULL || messageLen == 0) {
        fprintf(stderr, "[Error] hideMessage: Empty secret message provided.\n");
        return NULL;
    }

    // Step 1: Calculate capacity and verify image is large enough
    size_t totalColorChannels = (size_t)coverImage->width * (size_t)coverImage->height * 3;
    size_t requiredBits = 32 + (messageLen * 8); // 32 bits for length prefix + message bits

    if (requiredBits > totalColorChannels) {
        fprintf(stderr, "[Error] hideMessage: Message too large for image capacity!\n");
        fprintf(stderr, "        Required capacity: %zu bits (%zu bytes payload + 4 bytes header)\n",
                requiredBits, messageLen);
        fprintf(stderr, "        Available capacity: %zu bits (%zu bytes max payload)\n",
                totalColorChannels, (totalColorChannels >= 32) ? (totalColorChannels - 32) / 8 : 0);
        return NULL;
    }

    // Step 2: Clone the cover image so the original is completely preserved
    BMPImage *stegoImage = cloneImage(coverImage);
    if (stegoImage == NULL) {
        fprintf(stderr, "[Error] hideMessage: Failed to clone cover image.\n");
        return NULL;
    }

    // Step 3: Embed 32-bit length prefix followed by message payload bits
    uint32_t lengthHeader = (uint32_t)messageLen;
    size_t bitsEmbedded = 0;

    int width = stegoImage->width;
    int height = stegoImage->height;
    size_t rowStride = stegoImage->rowStride;
    uint8_t *pixels = stegoImage->pixelData;

    for (int y = 0; y < height && bitsEmbedded < requiredBits; y++) {
        uint8_t *rowPtr = pixels + ((size_t)y * rowStride);

        // Iterate over valid RGB color channel bytes only (skipping row padding)
        for (int x = 0; x < width * 3 && bitsEmbedded < requiredBits; x++) {
            uint8_t bit = 0;

            if (bitsEmbedded < 32) {
                // Embed 32-bit length prefix (Big-Endian: MSB to LSB)
                size_t shift = 31 - bitsEmbedded;
                bit = (uint8_t)((lengthHeader >> shift) & 1);
            } else {
                // Embed message payload bits
                size_t payloadBitIdx = bitsEmbedded - 32;
                size_t charIdx = payloadBitIdx / 8;
                size_t bitInChar = 7 - (payloadBitIdx % 8); // MSB to LSB
                bit = (uint8_t)(((unsigned char)message[charIdx] >> bitInChar) & 1);
            }

            // Replace Least Significant Bit (LSB) of color channel byte
            rowPtr[x] = (rowPtr[x] & 0xFE) | (bit & 0x01);
            bitsEmbedded++;
        }
    }

    return stegoImage;
}

char* extractMessage(const BMPImage *stegoImage, size_t *outLen) {
    if (stegoImage == NULL || stegoImage->pixelData == NULL) {
        fprintf(stderr, "[Error] extractMessage: Invalid stego image.\n");
        return NULL;
    }

    size_t totalColorChannels = (size_t)stegoImage->width * (size_t)stegoImage->height * 3;
    if (totalColorChannels < 32) {
        fprintf(stderr, "[Error] extractMessage: Image too small to contain length header.\n");
        return NULL;
    }

    int width = stegoImage->width;
    int height = stegoImage->height;
    size_t rowStride = stegoImage->rowStride;
    const uint8_t *pixels = stegoImage->pixelData;

    // Step 1: Extract 32-bit message length prefix from first 32 color channels
    uint32_t extractedLength = 0;
    size_t bitsRead = 0;

    for (int y = 0; y < height && bitsRead < 32; y++) {
        const uint8_t *rowPtr = pixels + ((size_t)y * rowStride);
        for (int x = 0; x < width * 3 && bitsRead < 32; x++) {
            uint8_t lsb = rowPtr[x] & 0x01;
            extractedLength = (extractedLength << 1) | lsb;
            bitsRead++;
        }
    }

    // Step 2: Validate extracted message length against image dimensions
    size_t maxPossiblePayload = (totalColorChannels - 32) / 8;
    if (extractedLength == 0 || (size_t)extractedLength > maxPossiblePayload) {
        fprintf(stderr, "[Error] extractMessage: Corrupt or absent secret message.\n");
        fprintf(stderr, "        Extracted length: %u bytes, Max possible capacity: %zu bytes.\n",
                extractedLength, maxPossiblePayload);
        return NULL;
    }

    // Step 3: Allocate buffer for the message (+1 for null terminator)
    char *message = (char*)malloc((size_t)extractedLength + 1);
    if (message == NULL) {
        fprintf(stderr, "[Error] extractMessage: Memory allocation failed for extracted message (%u bytes).\n",
                extractedLength);
        return NULL;
    }

    // Step 4: Extract payload bits
    size_t totalBitsToRead = 32 + ((size_t)extractedLength * 8);
    bitsRead = 0;
    size_t currentByteIdx = 0;
    uint8_t currentByteVal = 0;

    for (int y = 0; y < height && bitsRead < totalBitsToRead; y++) {
        const uint8_t *rowPtr = pixels + ((size_t)y * rowStride);
        for (int x = 0; x < width * 3 && bitsRead < totalBitsToRead; x++) {
            if (bitsRead >= 32) {
                // We are reading payload bits
                uint8_t lsb = rowPtr[x] & 0x01;
                currentByteVal = (uint8_t)((currentByteVal << 1) | lsb);

                size_t payloadBitIdx = bitsRead - 32;
                if ((payloadBitIdx % 8) == 7) {
                    message[currentByteIdx++] = (char)currentByteVal;
                    currentByteVal = 0;
                }
            }
            bitsRead++;
        }
    }

    // Null-terminate the string
    message[extractedLength] = '\0';

    if (outLen != NULL) {
        *outLen = (size_t)extractedLength;
    }

    return message;
}
