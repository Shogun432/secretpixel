/**
 * @file caesar.h
 * @brief Caesar Cipher Cryptographic Module for SecretPixel
 * 
 * Provides symmetric substitution cipher encryption and decryption
 * with a fixed shift value of 3. Supports uppercase letters, lowercase letters,
 * spaces, numbers, and special characters.
 */

#ifndef CAESAR_H
#define CAESAR_H

#include <stddef.h>

/** Fixed Caesar cipher shift value required by project specification */
#define CAESAR_SHIFT 3

/**
 * @brief Encrypts a plaintext string using Caesar Cipher with shift 3.
 *
 * Uppercase letters (A-Z) and lowercase letters (a-z) are shifted forward by 3
 * with cyclic wrap-around. Numbers, spaces, and special characters are preserved.
 *
 * @param plaintext  Null-terminated input string to be encrypted.
 * @param ciphertext Output buffer to store encrypted string. Must be at least
 *                   strlen(plaintext) + 1 bytes.
 */
void caesarEncrypt(const char *plaintext, char *ciphertext);

/**
 * @brief Decrypts a ciphertext string using Caesar Cipher with shift 3.
 *
 * Uppercase letters (A-Z) and lowercase letters (a-z) are shifted backward by 3
 * with cyclic wrap-around. Numbers, spaces, and special characters are preserved.
 *
 * @param ciphertext Null-terminated encrypted input string.
 * @param plaintext  Output buffer to store decrypted string. Must be at least
 *                   strlen(ciphertext) + 1 bytes.
 */
void caesarDecrypt(const char *ciphertext, char *plaintext);

#endif // CAESAR_H
