/**
 * @file caesar.c
 * @brief Implementation of Caesar Cipher with fixed shift of 3.
 *
 * Algorithm Details:
 * Encryption:
 *   For uppercase character c in ['A', 'Z']:
 *     E(c) = ((c - 'A' + shift) % 26) + 'A'
 *   For lowercase character c in ['a', 'z']:
 *     E(c) = ((c - 'a' + shift) % 26) + 'a'
 *   Non-alphabetic characters (numbers, spaces, symbols) remain unchanged:
 *     E(c) = c
 *
 * Decryption:
 *   For uppercase character c in ['A', 'Z']:
 *     D(c) = ((c - 'A' - shift + 26) % 26) + 'A'
 *   For lowercase character c in ['a', 'z']:
 *     D(c) = ((c - 'a' - shift + 26) % 26) + 'a'
 *   Non-alphabetic characters remain unchanged:
 *     D(c) = c
 */

#include "caesar.h"
#include <ctype.h>
#include <string.h>

void caesarEncrypt(const char *plaintext, char *ciphertext) {
    if (plaintext == NULL || ciphertext == NULL) {
        return;
    }

    size_t i = 0;
    while (plaintext[i] != '\0') {
        unsigned char ch = (unsigned char)plaintext[i];

        if (isupper(ch)) {
            // Shift uppercase character within 'A' - 'Z' range (modulo 26)
            ciphertext[i] = (char)(((ch - 'A' + CAESAR_SHIFT) % 26) + 'A');
        } else if (islower(ch)) {
            // Shift lowercase character within 'a' - 'z' range (modulo 26)
            ciphertext[i] = (char)(((ch - 'a' + CAESAR_SHIFT) % 26) + 'a');
        } else {
            // Spaces, numbers, and special characters remain unchanged
            ciphertext[i] = (char)ch;
        }
        i++;
    }

    // Ensure proper null-termination of the output string
    ciphertext[i] = '\0';
}

void caesarDecrypt(const char *ciphertext, char *plaintext) {
    if (ciphertext == NULL || plaintext == NULL) {
        return;
    }

    size_t i = 0;
    while (ciphertext[i] != '\0') {
        unsigned char ch = (unsigned char)ciphertext[i];

        if (isupper(ch)) {
            // Shift uppercase backward (+26 prevents negative modulo results in C)
            plaintext[i] = (char)(((ch - 'A' - CAESAR_SHIFT + 26) % 26) + 'A');
        } else if (islower(ch)) {
            // Shift lowercase backward
            plaintext[i] = (char)(((ch - 'a' - CAESAR_SHIFT + 26) % 26) + 'a');
        } else {
            // Spaces, numbers, and special characters remain unchanged
            plaintext[i] = (char)ch;
        }
        i++;
    }

    // Ensure proper null-termination of the output string
    plaintext[i] = '\0';
}
