# ===================================================================
# Makefile for SecretPixel (C Core)
# ===================================================================

CC = gcc
CFLAGS = -Wall -Wextra -std=c99 -O2
LDFLAGS = -lm

TARGET = secretpixel.exe
SRCS = main.c caesar.c bmp.c steganography.c
OBJS = $(SRCS:.c=.o)
HEADERS = caesar.h bmp.h steganography.h

all: $(TARGET)

$(TARGET): $(OBJS)
	$(CC) $(CFLAGS) -o $@ $^ $(LDFLAGS)

%.o: %.c $(HEADERS)
	$(CC) $(CFLAGS) -c $< -o $@

test: $(TARGET)
	./$(TARGET) test

clean:
	rm -f $(OBJS) $(TARGET) test_cover.bmp test_stego.bmp demo_stego.bmp json_stego.bmp

.PHONY: all test clean
