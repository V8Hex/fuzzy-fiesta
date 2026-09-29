@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 LTS from https://nodejs.org/ then open this file again.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 (
    echo Dependency setup failed. Check the messages above and your internet connection.
    pause
    exit /b 1
  )
)
call npm run web
pause
