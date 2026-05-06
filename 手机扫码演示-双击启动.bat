@echo off
chcp 65001 >nul
title Mobile Sales Card Demo
cd /d "%~dp0"

echo.
echo ========================================
echo  Mobile Sales Digital Card Demo
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo.
  echo Please install Node.js LTS first:
  echo https://nodejs.org/
  echo.
  pause
  exit /b 1
)

if not exist "node_modules\express" (
  echo Preparing dependencies. First run may take 1-3 minutes...
  call npm install
  if errorlevel 1 (
    echo Dependency installation failed. Please ask a technical colleague to help.
    pause
    exit /b 1
  )
)

call npm run setup >nul 2>nul

for /f "usebackq delims=" %%i in (`node scripts\detect-local-ip.mjs`) do set "LOCAL_IP=%%i"

if not defined LOCAL_IP (
  set "LOCAL_IP=localhost"
)

set "CARD_BASE_URL=http://%LOCAL_IP%:4173"
set "MOBILE_URL=%CARD_BASE_URL%/r/amelia-clarke"

echo window.MOBILE_DEMO_URL = "%MOBILE_URL%";> mobile-url.js
call npm run cards >nul 2>nul

echo.
echo Mobile demo URL:
echo %MOBILE_URL%
echo.
echo QR business cards have been regenerated for this local address.
echo Please make sure the phone and this computer are on the same hotspot or Wi-Fi.
echo Keep this window open while presenting.
echo.

start "" "http://localhost:4173/mobile-share.html"
node server.js
pause
