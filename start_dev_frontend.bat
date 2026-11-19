@echo off
setlocal
echo ===================================================================
echo   Starting SecretPixel Vite Frontend Dev Server (Port 3000)
echo   Proxies /api requests to http://127.0.0.1:8000
echo ===================================================================
cd /d "%~dp0frontend"
npm run dev
endlocal
