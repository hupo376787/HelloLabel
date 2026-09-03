@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

echo ============================================================
echo   HelloLabel Desktop - Windows build
echo ============================================================
echo   Target: Windows x64 (NSIS + ZIP)
echo   Runtime: Electron + static HTML/CSS/JS only
echo   AI: browser-local WebGPU/WASM, downloaded on demand
echo ============================================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Node.js 22 or newer was not found.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo [ERROR] npm was not found.
  pause
  exit /b 1
)

echo [1/2] Installing Electron build dependencies...
pushd desktop
call npm install --no-audit --no-fund
if errorlevel 1 (popd & goto :error)

echo [2/2] Building Windows installers...
call npm run dist:win -- --publish never
if errorlevel 1 (popd & goto :error)
popd

echo.
echo [OK] Output: dist\desktop\
echo      HelloLabel 1.5 contains no bundled Python runtime.
echo      End users do not need Python installed.
pause
exit /b 0

:error
echo.
echo [ERROR] Desktop build failed.
echo.
node --version 2>nul
npm --version 2>nul
pause
exit /b 1
