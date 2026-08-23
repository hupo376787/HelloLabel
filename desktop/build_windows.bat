@echo off
setlocal EnableExtensions
cd /d "%~dp0\.."

set "BUILD_VENV=desktop\.build-venv"
set "BUILD_PY=%BUILD_VENV%\Scripts\python.exe"
set "UV=%BUILD_VENV%\Scripts\uv.exe"

echo ============================================================
echo   HelloLabel Desktop - Windows build
echo ============================================================
echo   Target: Windows x64 (NSIS + portable)
echo   Release runtime: bundled CPython 3.12, NO AI packages.
echo ============================================================
echo.

if not exist "%BUILD_PY%" (
  echo [1/4] Creating isolated desktop build environment...
  py -3.12 -m venv "%BUILD_VENV%" 2>nul || py -m venv "%BUILD_VENV%"
  if errorlevel 1 goto :error
)

"%BUILD_PY%" -m pip install --upgrade pip uv
if errorlevel 1 goto :error

if exist "desktop\runtime" rmdir /s /q "desktop\runtime"
if exist "desktop\.runtime-python-download" rmdir /s /q "desktop\.runtime-python-download"

echo [2/4] Preparing self-contained Python 3.12 runtime...
"%BUILD_PY%" "desktop\prepare_runtime.py" --uv "%UV%"
if errorlevel 1 goto :error

echo [3/4] Installing Electron build dependencies...
pushd desktop
call npm install --no-audit --no-fund
if errorlevel 1 (popd & goto :error)

echo [4/4] Building Windows installers...
call npm run dist:win -- --publish never
if errorlevel 1 (popd & goto :error)
popd

echo.
echo [OK] Output: dist\desktop\
echo      The installer includes its own Python runtime.
echo      End users do NOT need Python installed.
pause
exit /b 0

:error
echo.
echo [ERROR] Desktop build failed.
echo.
echo Build-machine environment detected:
node --version 2^>nul
npm --version 2^>nul
py -3.12 --version 2^>nul
if exist "%BUILD_PY%" "%BUILD_PY%" --version 2^>nul
echo.
echo The build machine needs Node.js and Python 3.12 only to CREATE installers.
echo Installed HelloLabel users do not need system Python.
pause
exit /b 1
