@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title yexianglun Backend

echo ============================================
echo    yexianglun Backend
echo ============================================
echo.

set "BACKEND=E:\liu\Kirameku\Kirameku-backend"
set "PORT=8000"
set "PY=%BACKEND%\venv\Scripts\python.exe"

if not exist "%PY%" (
    echo [ERROR] venv not found: %PY%
    echo.
    pause
    exit /b 1
)

echo [1/2] Releasing port %PORT% ...
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    echo        Killing PID %%P
    taskkill /F /PID %%P >nul 2>&1
    set "FOUND=1"
)
if "%FOUND%"=="0" (
    echo        Port is free.
) else (
    timeout /t 2 /nobreak >nul
    echo        Port released.
)

echo.
echo [2/2] Starting uvicorn ...
echo        Press Ctrl+C to stop.
echo.
echo --------------------------------------------
cd /d "%BACKEND%"
"%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port %PORT%

echo.
echo --------------------------------------------
echo Server stopped.
pause
