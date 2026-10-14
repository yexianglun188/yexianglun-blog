@echo off
REM NeteaseCloudMusicApi Enhanced (local music / unblock service)
REM ENABLE_GENERAL_UNBLOCK=true  : required, otherwise VIP songs (Jay Chou etc.) have no URL
REM ENABLE_FLAC=false            : desktop Chromium cannot decode FLAC; x-flac causes
REM                                MEDIA_ERR_SRC_NOT_SUPPORTED and the player auto-skips.
REM Port 3301 must match NCM_API in Kirameku-backend/app/api/music.py

cd /d E:\liu\ncm-api
set ENABLE_GENERAL_UNBLOCK=true
set ENABLE_FLAC=false
set PORT=3301

echo [music] NeteaseCloudMusicApi Enhanced starting... http://localhost:3301
"C:\Users\Lenovo\.workbuddy\binaries\node\versions\22.22.2-6\node.exe" app.js