@echo off
chcp 65001 >nul
title Sales Digital Card Demo
cd /d "%~dp0"

echo.
echo ========================================
echo  Sales Digital Business Card Demo
echo ========================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found on this computer.
  echo.
  echo Please install Node.js LTS first:
  echo https://nodejs.org/
  echo.
  echo For a quick visual preview only, you can still open the static preview file in this folder.
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
call npm run cards >nul 2>nul

echo.
echo Demo home page:
echo http://localhost:4173/
echo.
echo Phone-scan QR target:
echo %CARD_BASE_URL%/amelia-clarke
echo.
echo Keep this window open while presenting.
echo Closing this window will stop the demo service.
echo.

start "" "http://localhost:4173/"
node server.js
pause
