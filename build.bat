@echo off
setlocal
echo ===================================================================
echo   Compiling SecretPixel C Backend using GCC...
echo ===================================================================

REM Check if GCC is in current PATH; if not, look in toolchain directory
where gcc >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    if exist "%~dp0toolchain\w64devkit\bin\gcc.exe" (
        set "PATH=%~dp0toolchain\w64devkit\bin;%PATH%"
    ) else (
        echo [Error] GCC compiler not found in PATH or in %~dp0toolchain\w64devkit\bin.
        exit /b 1
    )
)

gcc -Wall -Wextra -std=c99 -O2 main.c caesar.c bmp.c steganography.c -o secretpixel.exe -lm

if %ERRORLEVEL% EQU 0 (
    echo [Success] Compilation succeeded: secretpixel.exe generated!
    echo.
    echo Running automated test suite:
    echo -------------------------------------------------------------------
    secretpixel.exe test
) else (
    echo [Failure] Compilation failed with error code %ERRORLEVEL%.
)
endlocal
