@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

title Kirameku - Start All

echo ============================================
echo    Kirameku - Start All Services
echo ============================================
echo    Opens two windows: backend ^(8000^) + frontend ^(3000^)
echo.

set "ROOT=E:\liu\Kirameku"
set "BACKEND=%ROOT%\Kirameku-backend"
set "FRONTEND=%ROOT%\Kirameku"
set "PY=%BACKEND%\venv\Scripts\python.exe"

if not exist "%PY%" (
    echo [ERROR] venv not found: %PY%
    pause
    exit /b 1
)

echo [1/3] Releasing ports ...
for %%X in (8000 3000) do (
    for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":%%X" ^| findstr "LISTENING"') do (
        echo        Port %%X was held by PID %%P - killing
        taskkill /F /PID %%P >nul 2>&1
    )
)
timeout /t 2 /nobreak >nul
echo        Done.

echo.
echo [2/3] Opening backend window ...
cd /d "%BACKEND%"
start "Kirameku-Backend" "%PY%" -m uvicorn app.main:app --host 0.0.0.0 --port 8000
timeout /t 4 /nobreak >nul

echo [3/3] Opening frontend window ...
cd /d "%FRONTEND%"
start "Kirameku-Frontend" cmd /k "npm run dev"

echo.
echo ============================================
echo    Both windows launched. Waiting 15s ...
timeout /t 15 /nobreak >nul

echo.
echo    Health check:
call :CHECK 8000 /api/health "Backend API "
call :CHECK 3000 /          "Frontend    "
echo ============================================
echo      Blog    : http://localhost:3000
echo      Admin   : http://localhost:8000/admin/
echo      API Docs: http://localhost:8000/docs
echo ============================================
echo.
echo NOTE: If a check shows FAIL, look at that window.
echo       First frontend compile can take another 20s.
echo.
pause
exit /b 0

:CHECK
set "PORT=%~1"
set "EP=%~2"
set "NAME=%~3"
curl -s -o nul --max-time 6 http://localhost:%PORT%%EP% >nul 2>&1
if errorlevel 1 (
    echo        %NAME% http://localhost:%PORT% - NOT READY YET
) else (
    echo        %NAME% http://localhost:%PORT% - OK
)
exit /b 0
