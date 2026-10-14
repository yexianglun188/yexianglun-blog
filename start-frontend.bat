@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title yexianglun Frontend

echo ============================================
echo    yexianglun Frontend  (Next.js)
echo ============================================
echo.

set "FRONTEND=E:\liu\Kirameku\Kirameku"
set "PORT=3000"

if not exist "%FRONTEND%\package.json" (
    echo [ERROR] package.json not found: %FRONTEND%
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
echo [2/2] Starting Next.js dev server ...
echo        Press Ctrl+C to stop.
echo        First compile takes 10-20 seconds.
echo.
echo --------------------------------------------
cd /d "%FRONTEND%"
npm run dev

echo.
echo --------------------------------------------
echo Server stopped.
pause
