@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "OUT=dist\web"

echo ============================================================
echo   HelloLabel 1.5 - Build Static Web Distribution
echo ============================================================

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%\static" || exit /b 1

xcopy /e /i /y "static\*" "%OUT%\static\" >nul
if errorlevel 1 goto :error
copy /y "static\index.html" "%OUT%\index.html" >nul
if errorlevel 1 goto :error
if exist "%OUT%\static\index.html" del /q "%OUT%\static\index.html"

> "%OUT%\VERSION.txt" echo HelloLabel 1.5.0 - browser-only static runtime

echo [OK] Static site created at %OUT%
echo      Upload the CONTENTS of %OUT% to your Nginx document root.
echo      No Python, FastAPI, Uvicorn, OpenCV or server-side AI is required.
exit /b 0

:error
echo [ERROR] Failed to build static web distribution.
exit /b 1
