@echo off
setlocal EnableExtensions
cd /d "%~dp0"

set "PY=.venv\Scripts\python.exe"

if not exist "%PY%" (
  echo [ERROR] HelloLabel's .venv does not exist.
  echo Run start_web.bat once to create the isolated environment first.
  pause
  exit /b 1
)

"%PY%" -m unittest -v tests.test_geometry tests.test_api
if errorlevel 1 (
  echo.
  echo Verification failed.
  pause
  exit /b 1
)

echo.
echo HelloLabel verification passed using .venv only.
pause
