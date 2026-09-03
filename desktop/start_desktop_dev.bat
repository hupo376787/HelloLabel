@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22 or newer is required.
  pause
  exit /b 1
)

pushd desktop
if not exist node_modules call npm install --no-audit --no-fund
if errorlevel 1 (popd & pause & exit /b 1)
call npm start
set "RC=%ERRORLEVEL%"
popd
exit /b %RC%
