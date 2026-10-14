@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title yexianglun Frontend (Production)

echo ============================================
echo    yexianglun Frontend - Production Mode
echo    (build + start, for cpolar tunnel / demo)
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

echo [1/3] Releasing port %PORT% ...
set "FOUND=0"
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    echo        Killing PID %%P
    taskkill /F /PID %%P >nul 2>&1
    set "FOUND=1"
)
if "%FOUND%"=="1" timeout /t 2 /nobreak >nul
echo        Done.

echo.
echo [2/3] Building production bundle ...
cd /d "%FRONTEND%"
call npm run build
if errorlevel 1 (
    echo [ERROR] Build failed. Check the output above.
    pause
    exit /b 1
)

echo.
echo [3/3] Starting production server ...
echo        Press Ctrl+C to stop.
echo.
echo --------------------------------------------
npx next start -p %PORT%

echo.
echo Server stopped.
pause
