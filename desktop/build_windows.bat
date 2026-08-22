@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

set "VENV=.venv"
set "PY=%VENV%\Scripts\python.exe"

echo ============================================================
echo   HelloLabel Desktop - Windows build
echo ============================================================
echo   Build target: Windows x64 (NSIS + portable)
echo   Python backend and Electron shell are bundled separately.
echo ============================================================
echo.

if not exist "%PY%" (
  echo [1/5] Creating isolated Python environment...
  py -3.12 -m venv "%VENV%" 2>nul || py -m venv "%VENV%"
  if errorlevel 1 goto :error
  "%PY%" -m pip install --upgrade pip
  if errorlevel 1 goto :error
  "%PY%" -m pip install -r requirements.txt
  if errorlevel 1 goto :error
) else (
  echo [1/5] Using existing .venv
)

echo [2/5] Installing/updating PyInstaller in HelloLabel's .venv...
"%PY%" -m pip install --upgrade pyinstaller
if errorlevel 1 goto :error

if exist "desktop\backend-build" rmdir /s /q "desktop\backend-build"
if exist "desktop\backend-dist" rmdir /s /q "desktop\backend-dist"

echo [3/5] Freezing Python backend...
"%PY%" -m PyInstaller "desktop\hellolabel-server.spec" --noconfirm --clean --workpath "desktop\backend-build" --distpath "desktop\backend-dist"
if errorlevel 1 goto :error

echo [4/5] Installing Electron build dependencies...
pushd desktop
rem Clean a stale lock file from HelloLabel v0.2.2, which referenced the non-existent stable electron-builder 27.0.0.
if exist "package-lock.json" (
  findstr /c:"27.0.0" "package-lock.json" >nul 2>nul
  if not errorlevel 1 (
    echo       Removing stale package-lock.json from the previous electron-builder 27.0.0 configuration...
    del /q "package-lock.json" >nul 2>nul
  )
)
call npm install --no-audit --no-fund
if errorlevel 1 (popd & goto :error)

echo [5/5] Building Windows installers...
call npm run dist:win
if errorlevel 1 (popd & goto :error)
popd

echo.
echo [OK] Output: dist\desktop\
pause
exit /b 0

:error
echo.
echo [ERROR] Desktop build failed.
echo.
echo Environment detected:
node --version 2^>nul
npm --version 2^>nul
"%PY%" --version 2^>nul
echo.
echo The failure reason is shown above this message.
echo Note: electron-builder 27.0.0 is not a stable npm release; HelloLabel pins 26.15.3.
echo If npm still reports ETARGET, delete desktop\node_modules and desktop\package-lock.json, then run this script again.
pause
exit /b 1
