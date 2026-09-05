@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "OUT=dist\web"
set "CACHE_TOKEN=hellolabel-v210-t6"

echo ============================================================
echo   HelloLabel 2.1 - Build Static Web Distribution
echo ============================================================

if exist "%OUT%" rmdir /s /q "%OUT%"
mkdir "%OUT%\static" || exit /b 1
mkdir "%OUT%\admin" || exit /b 1

xcopy /e /i /y "static\*" "%OUT%\static\" >nul
if errorlevel 1 goto :error
xcopy /e /i /y "admin\*" "%OUT%\admin\" >nul
if errorlevel 1 goto :error
copy /y "static\index.html" "%OUT%\index.html" >nul
if errorlevel 1 goto :error
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p='%OUT%\index.html'; $c=[IO.File]::ReadAllText($p); $c=[regex]::Replace($c,'hellolabel-v[0-9A-Za-z-]+','%CACHE_TOKEN%'); [IO.File]::WriteAllText($p,$c,(New-Object Text.UTF8Encoding($false)))"
if errorlevel 1 goto :error
copy /y "_headers" "%OUT%\_headers" >nul
if errorlevel 1 goto :error
copy /y "_redirects" "%OUT%\_redirects" >nul
if errorlevel 1 goto :error
if exist "%OUT%\static\index.html" del /q "%OUT%\static\index.html"

> "%OUT%\VERSION.txt" echo HelloLabel 2.1.0 - browser-only static runtime

echo [OK] Static site created at %OUT%
echo      Upload the CONTENTS of %OUT% to your Nginx document root or Cloudflare Pages.
echo      Cloudflare Pages Functions remain in the repository-level functions\ directory.
echo      No Python, FastAPI, Uvicorn, OpenCV or server-side AI is required.
exit /b 0

:error
echo [ERROR] Failed to build static web distribution.
exit /b 1
