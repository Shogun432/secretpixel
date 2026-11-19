/**
 * @file main.c
 * @brief SecretPixel Core CLI Driver & Academic Demonstration Engine
 *
 * Implements command-line interface for:
 *  - Embedding: Plaintext -> Caesar Cipher (Shift 3) -> LSB Stego -> Stego BMP
 *  - Extraction: Stego BMP -> LSB Extract -> Caesar Decrypt (Shift 3) -> Plaintext
 *  - Quality Metrics: MSE (Mean Squared Error) and PSNR (Peak Signal-to-Noise Ratio)
 *  - Self-Test: Automated validation of cipher, row padding, embed, and extract
 */

#include "bmp.h"
#include "caesar.h"
#include "steganography.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

/**
 * @brief Safely prints a string with JSON-compliant escaping for quotes,
 * backslashes, and control characters.
 */
static void printJsonEscaped(const char *str) {
    if (str == NULL) {
        return;
    }
    for (const char *p = str; *p != '\0'; p++) {
        switch (*p) {
            case '\\': fputs("\\\\", stdout); break;
            case '"':  fputs("\\\"", stdout); break;
            case '\b': fputs("\\b", stdout); break;
            case '\f': fputs("\\f", stdout); break;
            case '\n': fputs("\\n", stdout); break;
            case '\r': fputs("\\r", stdout); break;
            case '\t': fputs("\\t", stdout); break;
            default:
                if ((unsigned char)*p < 0x20) {
                    printf("\\u%04x", (unsigned char)*p);
                } else {
                    fputc(*p, stdout);
                }
                break;
        }
    }
}

/**
 * @brief Computes Mean Squared Error (MSE) and Peak Signal-to-Noise Ratio (PSNR)
 * between the original cover image and the generated stego image.
 */
static void computeQualityMetrics(const BMPImage *cover, const BMPImage *stego, double *outMSE, double *outPSNR, size_t *outModified) {
    if (cover == NULL || stego == NULL || cover->width != stego->width || cover->height != stego->height) {
        *outMSE = 0.0;
        *outPSNR = 0.0;
        *outModified = 0;
        return;
    }

    double sumSquaredDiff = 0.0;
    size_t totalColorChannels = (size_t)cover->width * (size_t)cover->height * 3;
    size_t modifiedChannels = 0;

    int width = cover->width;
    int height = cover->height;
    size_t rowStride = cover->rowStride;

    for (int y = 0; y < height; y++) {
        const uint8_t *coverRow = cover->pixelData + ((size_t)y * rowStride);
        const uint8_t *stegoRow = stego->pixelData + ((size_t)y * rowStride);

        for (int x = 0; x < width * 3; x++) {
            int diff = (int)coverRow[x] - (int)stegoRow[x];
            if (diff != 0) {
                modifiedChannels++;
            }
            sumSquaredDiff += (double)(diff * diff);
        }
    }

    double mse = sumSquaredDiff / (double)totalColorChannels;
    double psnr = 0.0;
    if (mse <= 1e-10) {
        psnr = 99.99; // Essentially identical
    } else {
        psnr = 10.0 * log10((255.0 * 255.0) / mse);
    }

    *outMSE = mse;
    *outPSNR = psnr;
    *outModified = modifiedChannels;
}

static void printUsage(const char *progName) {
    printf("\n===================================================================\n");
    printf("   SecretPixel: Caesar Cipher & LSB Image Steganography (C Core)\n");
    printf("===================================================================\n");
    printf("Usage:\n");
    printf("  Embed secret message:\n");
    printf("    %s embed -i <cover.bmp> -o <stego.bmp> -m \"<secret message>\" [--json]\n\n", progName);
    printf("  Extract secret message:\n");
    printf("    %s extract -i <stego.bmp> [--json]\n\n", progName);
    printf("  Inspect BMP image properties & capacity:\n");
    printf("    %s info -i <image.bmp> [--json]\n\n", progName);
    printf("  Run automated system self-tests:\n");
    printf("    %s test\n", progName);
    printf("===================================================================\n\n");
}

static int handleEmbed(const char *coverPath, const char *stegoPath, const char *message, int jsonMode) {
    if (coverPath == NULL || stegoPath == NULL || message == NULL) {
        fprintf(stderr, "[Error] embed: Missing required arguments (-i, -o, -m).\n");
        return 1;
    }

    // 1. Load original cover image
    BMPImage *coverImage = loadImage(coverPath);
    if (coverImage == NULL) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Failed to load cover image: ");
            printJsonEscaped(coverPath);
            printf("\"}\n");
        }
        return 1;
    }

    size_t msgLen = strlen(message);
    size_t capacity = getImageCapacity(coverImage);

    // 2. Check capacity
    if (msgLen > capacity) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Message exceeds image capacity\",\"msgLen\":%zu,\"capacity\":%zu}\n",
                   msgLen, capacity);
        } else {
            fprintf(stderr, "[Error] Message length (%zu bytes) exceeds maximum capacity (%zu bytes).\n",
                    msgLen, capacity);
        }
        freeImage(coverImage);
        return 1;
    }

    // 3. Encrypt message using Caesar Cipher (shift 3)
    char *ciphertext = (char*)malloc(msgLen + 1);
    if (ciphertext == NULL) {
        fprintf(stderr, "[Error] Memory allocation failed for ciphertext.\n");
        freeImage(coverImage);
        return 1;
    }
    caesarEncrypt(message, ciphertext);

    // 4. Embed ciphertext into pixel LSBs (preserves coverImage intact)
    BMPImage *stegoImage = hideMessage(coverImage, ciphertext, msgLen);
    if (stegoImage == NULL) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"LSB embedding failed\"}\n");
        }
        free(ciphertext);
        freeImage(coverImage);
        return 1;
    }

    // 5. Save stego image to disk
    if (!saveImage(stegoPath, stegoImage)) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Failed to save stego image: ");
            printJsonEscaped(stegoPath);
            printf("\"}\n");
        }
        free(ciphertext);
        freeImage(coverImage);
        freeImage(stegoImage);
        return 1;
    }

    // 6. Compute imperceptibility metrics (MSE & PSNR)
    double mse = 0.0, psnr = 0.0;
    size_t modifiedChannels = 0;
    computeQualityMetrics(coverImage, stegoImage, &mse, &psnr, &modifiedChannels);

    if (jsonMode) {
        printf("{\"status\":\"success\",\"operation\":\"embed\",\"cover\":\"");
        printJsonEscaped(coverPath);
        printf("\",\"stego\":\"");
        printJsonEscaped(stegoPath);
        printf("\",\"width\":%d,\"height\":%d,\"capacity\":%zu,\"message_len\":%zu,"
               "\"caesar_shift\":%d,\"ciphertext\":\"",
               coverImage->width, coverImage->height, capacity, msgLen, CAESAR_SHIFT);
        printJsonEscaped(ciphertext);
        printf("\",\"modified_channels\":%zu,\"mse\":%.6f,\"psnr_db\":%.2f}\n",
               modifiedChannels, mse, psnr);
    } else {
        printf("\n=================== EMBEDDING SUCCESSFUL ===================\n");
        printf(" Cover Image          : %s\n", coverPath);
        printf(" Stego Image Output   : %s\n", stegoPath);
        printf(" Dimensions           : %d x %d pixels (24-bit RGB)\n", coverImage->width, coverImage->height);
        printf(" Max Payload Capacity : %zu bytes\n", capacity);
        printf(" Plaintext Length     : %zu bytes\n", msgLen);
        printf(" Caesar Shift         : +%d\n", CAESAR_SHIFT);
        printf(" Encrypted Ciphertext : %s\n", ciphertext);
        printf(" Embedded Channels    : %zu / %zu bits modified\n", modifiedChannels, (size_t)coverImage->width * coverImage->height * 3);
        printf(" Mean Squared Error   : %.6f\n", mse);
        printf(" PSNR (Quality Score) : %.2f dB (Imperceptible)\n", psnr);
        printf("============================================================\n\n");
    }

    free(ciphertext);
    freeImage(coverImage);
    freeImage(stegoImage);
    return 0;
}

static int handleExtract(const char *stegoPath, int jsonMode) {
    if (stegoPath == NULL) {
        fprintf(stderr, "[Error] extract: Missing required argument (-i <stego.bmp>).\n");
        return 1;
    }

    // 1. Load stego image
    BMPImage *stegoImage = loadImage(stegoPath);
    if (stegoImage == NULL) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Failed to load stego image: ");
            printJsonEscaped(stegoPath);
            printf("\"}\n");
        }
        return 1;
    }

    // 2. Extract hidden ciphertext via LSB extraction
    size_t extractedLen = 0;
    char *extractedCiphertext = extractMessage(stegoImage, &extractedLen);
    if (extractedCiphertext == NULL) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Failed to extract secret message. Corrupted or no message embedded.\"}\n");
        } else {
            fprintf(stderr, "[Error] No valid secret message found in '%s'.\n", stegoPath);
        }
        freeImage(stegoImage);
        return 1;
    }

    // 3. Decrypt ciphertext using Caesar Cipher (shift 3)
    char *decryptedPlaintext = (char*)malloc(extractedLen + 1);
    if (decryptedPlaintext == NULL) {
        fprintf(stderr, "[Error] Memory allocation failed for decrypted plaintext.\n");
        free(extractedCiphertext);
        freeImage(stegoImage);
        return 1;
    }
    caesarDecrypt(extractedCiphertext, decryptedPlaintext);

    if (jsonMode) {
        printf("{\"status\":\"success\",\"operation\":\"extract\",\"stego\":\"");
        printJsonEscaped(stegoPath);
        printf("\",\"length\":%zu,\"ciphertext\":\"", extractedLen);
        printJsonEscaped(extractedCiphertext);
        printf("\",\"decrypted_plaintext\":\"");
        printJsonEscaped(decryptedPlaintext);
        printf("\"}\n");
    } else {
        printf("\n=================== EXTRACTION SUCCESSFUL ===================\n");
        printf(" Stego Image Source   : %s\n", stegoPath);
        printf(" Extracted Length     : %zu bytes\n", extractedLen);
        printf(" Extracted Ciphertext : %s\n", extractedCiphertext);
        printf(" Caesar Shift Key     : -%d\n", CAESAR_SHIFT);
        printf(" Decrypted Message    : %s\n", decryptedPlaintext);
        printf("=============================================================\n\n");
    }

    free(decryptedPlaintext);
    free(extractedCiphertext);
    freeImage(stegoImage);
    return 0;
}

static int handleInfo(const char *imagePath, int jsonMode) {
    if (imagePath == NULL) {
        fprintf(stderr, "[Error] info: Missing image path (-i <image.bmp>).\n");
        return 1;
    }

    BMPImage *image = loadImage(imagePath);
    if (image == NULL) {
        if (jsonMode) {
            printf("{\"status\":\"error\",\"message\":\"Failed to inspect image: ");
            printJsonEscaped(imagePath);
            printf("\"}\n");
        }
        return 1;
    }

    size_t capacity = getImageCapacity(image);

    if (jsonMode) {
        printf("{\"status\":\"success\",\"operation\":\"info\",\"file\":\"");
        printJsonEscaped(imagePath);
        printf("\",\"width\":%d,\"height\":%d,\"bpp\":%d,\"planes\":%d,"
               "\"padding_per_row\":%d,\"row_stride\":%zu,\"data_size\":%zu,"
               "\"max_capacity_bytes\":%zu}\n",
               image->width, image->height, image->infoHeader.biBitCount,
               image->infoHeader.biPlanes, image->padding, image->rowStride,
               image->dataSize, capacity);
    } else {
        printf("\n===================== BMP IMAGE DETAILS =====================\n");
        printf(" File Path        : %s\n", imagePath);
        printf(" Resolution       : %d x %d pixels\n", image->width, image->height);
        printf(" Color Depth      : %d bits per pixel (24-bit RGB)\n", image->infoHeader.biBitCount);
        printf(" Row Padding      : %d byte(s) per scanline\n", image->padding);
        printf(" Row Stride       : %zu bytes per scanline\n", image->rowStride);
        printf(" Raw Image Data   : %zu bytes\n", image->dataSize);
        printf(" Max Payload Size : %zu characters (bytes)\n", capacity);
        printf("=============================================================\n\n");
    }

    freeImage(image);
    return 0;
}

/**
 * @brief Creates a synthetic 24-bit BMP image on disk for automated testing.
 * Uses dimensions with non-zero row padding (e.g. 5x5 pixels: width*3=15 -> padding=1).
 */
static bool createSyntheticBMP(const char *filename, int width, int height) {
    BMPImage img;
    memset(&img, 0, sizeof(BMPImage));

    img.width = width;
    img.height = height;
    img.isTopDown = 0;
    img.padding = (4 - ((width * 3) % 4)) % 4;
    img.rowStride = (size_t)(width * 3 + img.padding);
    img.dataSize = img.rowStride * (size_t)height;

    img.fileHeader.bfType = BMP_MAGIC;
    img.fileHeader.bfOffBits = sizeof(BMPFileHeader) + sizeof(BMPInfoHeader);
    img.fileHeader.bfSize = img.fileHeader.bfOffBits + (uint32_t)img.dataSize;

    img.infoHeader.biSize = sizeof(BMPInfoHeader);
    img.infoHeader.biWidth = width;
    img.infoHeader.biHeight = height;
    img.infoHeader.biPlanes = 1;
    img.infoHeader.biBitCount = 24;
    img.infoHeader.biCompression = 0;
    img.infoHeader.biSizeImage = (uint32_t)img.dataSize;

    img.pixelData = (uint8_t*)malloc(img.dataSize);
    if (img.pixelData == NULL) return false;

    // Fill with a colorful test pattern (gradient)
    for (int y = 0; y < height; y++) {
        uint8_t *row = img.pixelData + ((size_t)y * img.rowStride);
        for (int x = 0; x < width; x++) {
            row[x * 3 + 0] = (uint8_t)((x * 40) % 256);        // Blue
            row[x * 3 + 1] = (uint8_t)((y * 50) % 256);        // Green
            row[x * 3 + 2] = (uint8_t)(((x + y) * 30) % 256);  // Red
        }
        // Zero-out padding bytes
        for (int p = 0; p < img.padding; p++) {
            row[width * 3 + p] = 0;
        }
    }

    bool ok = saveImage(filename, &img);
    free(img.pixelData);
    return ok;
}

static int runSelfTest(void) {
    printf("\n===================================================================\n");
    printf("        RUNNING SECRETPXEL COMPREHENSIVE SYSTEM SELF-TEST\n");
    printf("===================================================================\n");

    int testsPassed = 0;
    int totalTests = 5;

    // --- TEST 1: Caesar Cipher Encryption ---
    printf("\n[Test 1/5] Caesar Cipher Encryption (Shift 3)...\n");
    const char *testPlain = "SecretPixel 2026! Testing: Hello, World @#$";
    char testCipher[128];
    char testDecrypted[128];

    caesarEncrypt(testPlain, testCipher);
    printf("  Plaintext  : \"%s\"\n", testPlain);
    printf("  Ciphertext : \"%s\"\n", testCipher);

    // Verify 'S' -> 'V', 'e' -> 'h', 'c' -> 'f', 'r' -> 'u', 'e' -> 'h', 't' -> 'w'
    // 'P' -> 'S', 'i' -> 'l', 'x' -> 'a', 'e' -> 'h', 'l' -> 'o'
    // Numbers & symbols preserved: " 2026! Testing: " -> " 2026! Whvwlqj: "
    if (strncmp(testCipher, "VhfuhwSlaho 2026! Whvwlqj: Khoor, Zruog @#$", 42) == 0) {
        printf("  [PASS] Encryption handles uppercase, lowercase, numbers & symbols!\n");
        testsPassed++;
    } else {
        printf("  [FAIL] Ciphertext does not match expected transformation.\n");
    }

    // --- TEST 2: Caesar Cipher Decryption ---
    printf("\n[Test 2/5] Caesar Cipher Decryption (Shift -3)...\n");
    caesarDecrypt(testCipher, testDecrypted);
    printf("  Decrypted  : \"%s\"\n", testDecrypted);

    if (strcmp(testPlain, testDecrypted) == 0) {
        printf("  [PASS] Decryption perfectly matches original plaintext!\n");
        testsPassed++;
    } else {
        printf("  [FAIL] Decrypted text mismatch.\n");
    }

    // --- TEST 3: BMP File Creation & Padding Verification ---
    printf("\n[Test 3/5] BMP Creation with Odd Row Padding (Width = 33, Height = 25)...\n");
    const char *testCoverBMP = "test_cover.bmp";
    const char *testStegoBMP = "test_stego.bmp";

    // 33 pixels * 3 bytes = 99 bytes per row. 99 % 4 = 3, so padding = (4 - 3) % 4 = 1 byte!
    if (!createSyntheticBMP(testCoverBMP, 33, 25)) {
        printf("  [FAIL] Could not generate synthetic BMP.\n");
    } else {
        BMPImage *loaded = loadImage(testCoverBMP);
        if (loaded != NULL && loaded->padding == 1 && loaded->width == 33 && loaded->height == 25) {
            printf("  [PASS] BMP loaded successfully. Verified row padding = %d byte.\n", loaded->padding);
            printf("         Capacity: %zu bytes.\n", getImageCapacity(loaded));
            freeImage(loaded);
            testsPassed++;
        } else {
            printf("  [FAIL] Loaded BMP attributes invalid.\n");
            if (loaded) freeImage(loaded);
        }
    }

    // --- TEST 4: End-to-End LSB Embed and Extract ---
    printf("\n[Test 4/5] End-to-End LSB Embed and Extract with Shift 3...\n");
    const char *secretMsg = "Academic Project: SecretPixel LSB Verification OK!";
    int embedResult = handleEmbed(testCoverBMP, testStegoBMP, secretMsg, 0);

    if (embedResult == 0) {
        BMPImage *stego = loadImage(testStegoBMP);
        if (stego != NULL) {
            size_t extLen = 0;
            char *extCipher = extractMessage(stego, &extLen);
            if (extCipher != NULL) {
                char extPlain[128];
                caesarDecrypt(extCipher, extPlain);
                printf("  Original Message  : \"%s\"\n", secretMsg);
                printf("  Extracted Message : \"%s\"\n", extPlain);

                if (strcmp(secretMsg, extPlain) == 0) {
                    printf("  [PASS] Message successfully embedded, extracted, and decrypted!\n");
                    testsPassed++;
                } else {
                    printf("  [FAIL] Extracted text differs from original.\n");
                }
                free(extCipher);
            } else {
                printf("  [FAIL] extractMessage() returned NULL.\n");
            }
            freeImage(stego);
        } else {
            printf("  [FAIL] Could not reload generated stego image.\n");
        }
    } else {
        printf("  [FAIL] handleEmbed failed.\n");
    }

    // --- TEST 5: Original Cover Image Preservation ---
    printf("\n[Test 5/5] Verify Original Cover Image Preservation...\n");
    BMPImage *origCover = loadImage(testCoverBMP);
    // Reload cover from disk and verify its bytes
    if (origCover != NULL) {
        // Embed a message into a clone and ensure origCover is not modified
        size_t initialDataSum = 0;
        for (size_t i = 0; i < origCover->dataSize; i++) {
            initialDataSum += origCover->pixelData[i];
        }

        BMPImage *dummyStego = hideMessage(origCover, "Test Preservation", 17);
        size_t postDataSum = 0;
        for (size_t i = 0; i < origCover->dataSize; i++) {
            postDataSum += origCover->pixelData[i];
        }

        if (initialDataSum == postDataSum && dummyStego != NULL) {
            printf("  [PASS] Cover image data checksum identical before and after embedding!\n");
            testsPassed++;
        } else {
            printf("  [FAIL] Cover image was mutated in-place during embedding.\n");
        }

        freeImage(origCover);
        if (dummyStego) freeImage(dummyStego);
    } else {
        printf("  [FAIL] Could not load cover for preservation test.\n");
    }

    // Summary
    printf("\n===================================================================\n");
    printf("   SELF-TEST RESULTS: %d / %d TESTS PASSED (%.0f%%)\n",
           testsPassed, totalTests, ((double)testsPassed / totalTests) * 100.0);
    printf("===================================================================\n\n");

    return (testsPassed == totalTests) ? 0 : 1;
}

int main(int argc, char *argv[]) {
    if (argc < 2) {
        printUsage(argv[0]);
        return runSelfTest(); // Default to self-test if run without arguments
    }

    const char *command = argv[1];

    if (strcmp(command, "test") == 0 || strcmp(command, "--test") == 0) {
        return runSelfTest();
    }

    const char *coverPath = NULL;
    const char *stegoPath = NULL;
    const char *message = NULL;
    int jsonMode = 0;

    for (int i = 2; i < argc; i++) {
        if (strcmp(argv[i], "-i") == 0 && i + 1 < argc) {
            coverPath = argv[++i];
            stegoPath = coverPath; // In extract mode, -i specifies the stego image
        } else if (strcmp(argv[i], "-o") == 0 && i + 1 < argc) {
            stegoPath = argv[++i];
        } else if (strcmp(argv[i], "-m") == 0 && i + 1 < argc) {
            message = argv[++i];
        } else if (strcmp(argv[i], "--json") == 0) {
            jsonMode = 1;
        }
    }

    if (strcmp(command, "embed") == 0) {
        return handleEmbed(coverPath, stegoPath, message, jsonMode);
    } else if (strcmp(command, "extract") == 0) {
        return handleExtract(stegoPath, jsonMode);
    } else if (strcmp(command, "info") == 0) {
        return handleInfo(coverPath, jsonMode);
    } else {
        fprintf(stderr, "[Error] Unknown command: '%s'\n", command);
        printUsage(argv[0]);
        return 1;
    }
}
