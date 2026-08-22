@echo off
setlocal
cd /d "%~dp0\.."
if not exist ".venv\Scripts\python.exe" (
  echo Run start_web.bat once first so HelloLabel's .venv is created.
  pause
  exit /b 1
)
pushd desktop
if not exist node_modules call npm install
call npm start
popd
