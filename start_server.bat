@echo off
setlocal
echo ===================================================================
echo   Starting SecretPixel Full-Stack System (FastAPI + React Frontend)
echo ===================================================================
echo   Frontend Web Dashboard : http://127.0.0.1:8000
echo   Interactive API Docs   : http://127.0.0.1:8000/docs
echo ===================================================================

REM Ensure C executable exists
if not exist "%~dp0secretpixel.exe" (
    echo [Warning] secretpixel.exe not found! Building backend now...
    call "%~dp0build.bat"
)

python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
endlocal
