@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title QQMusicApi (QQ Music vkey proxy)

echo ============================================
echo    QQMusicApi  -  QQ Music play-link proxy
echo    Port 3300, required by /api/music/url
echo ============================================
echo.

set "QQAPI=E:\liu\QQMusicApi"
set "PORT=3300"
set "NODE=C:\Users\Lenovo\.workbuddy\binaries\node\versions\22.22.2-6\node.exe"

if not exist "%QQAPI%\bin\www" (
    echo [ERROR] QQMusicApi not found: %QQAPI%
    echo         Please clone it first:
    echo           git clone https://github.com/jsososo/QQMusicApi.git E:\liu\QQMusicApi
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
echo [2/2] Starting QQMusicApi ...
echo        Play-link endpoint: http://localhost:3300/song/url?id={songmid}
echo        Press Ctrl+C to stop.
echo.
echo --------------------------------------------
cd /d "%QQAPI%"
"%NODE%" ./bin/www

echo.
echo --------------------------------------------
echo Server stopped.
pause
