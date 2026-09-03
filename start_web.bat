@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HelloLabel 1.5 Static Web

set "PORT=9010"
set "PYTHON="

where py >nul 2>nul
if not errorlevel 1 set "PYTHON=py -3"
if not defined PYTHON (
  where python >nul 2>nul
  if not errorlevel 1 set "PYTHON=python"
)

if not defined PYTHON (
  echo ============================================================
  echo   HelloLabel 1.5 - Static Web
  echo ============================================================
  echo [ERROR] A static HTTP server is required for local development.
  echo.
  echo Production deployment does NOT require Python: use Nginx or any
  echo ordinary static web server. For this helper only, install Python
  echo or serve the repository root with another static server.
  pause
  exit /b 1
)

echo ============================================================
echo   HelloLabel 1.5 - Static Web
 echo ============================================================
echo   URL: http://127.0.0.1:%PORT%/static/
echo   Backend API: none
echo   Images/JSON: local browser file system only
echo   AI: local browser WebGPU/WASM
echo ============================================================
echo.

start "" "http://127.0.0.1:%PORT%/static/"
%PYTHON% -m http.server %PORT% --bind 127.0.0.1 --directory "%CD%"
