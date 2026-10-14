@echo off
chcp 65001 >nul
title Kirameku - Stop Services

echo ============================================
echo    Kirameku - Stop Services
echo    Stop running services by port
echo ============================================
echo.

rem 默认停止这三个应用端口（前端 / 后端 / 音乐API）
rem 想连数据库和穿透一起停，加参数：stop-all.bat all
set SCOPE=%1

call :KILLPORT 3000 "Frontend     3000"
call :KILLPORT 8000 "Backend      8000"
call :KILLPORT 3300 "QQMusicApi   3300"

if /i "%SCOPE%"=="all" (
    echo.
    echo Stopping system services (needs Administrator) ...
    net session >nul 2>&1
    if errorlevel 1 (
        echo    [SKIP] Not running as Administrator.
        echo    To stop PostgreSQL / cpolar, rerun this script as Administrator,
        echo    or use PowerShell:  Stop-Service -Name postgresql-x64-16,cpolar -Force
    ) else (
        net stop postgresql-x64-16 /y
        net stop cpolar /y
    )
)

echo.
echo ============================================
echo    Done. Remaining listeners:
netstat -ano | findstr "LISTENING" | findstr ":3000 :8000 :3300"
echo ============================================
echo.
echo Tip: start again with:
echo    start-frontend.bat          (dev mode, hot reload)
echo    start-frontend-prod.bat     (production mode, for public access)
echo    start-backend.bat           (backend API)
echo    start-qqmusic.bat           (QQ music service)
echo.
pause
exit /b 0

:KILLPORT
setlocal enabledelayedexpansion
set PORT=%~1
set NAME=%~2
set FOUND=0
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%PORT%" ^| findstr "LISTENING"') do (
    echo    Stopping %NAME% - PID %%P
    taskkill /F /PID %%P >nul 2>&1
    set FOUND=1
)
if "!FOUND!"=="0" echo    %NAME% - not running
endlocal
exit /b 0
