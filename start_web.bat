@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title HelloLabel Web Server

set "VENV_DIR=.venv"
set "PY=%VENV_DIR%\Scripts\python.exe"
set "PY_LAUNCHER="

rem ============================================================
rem HelloLabel always runs in its own local virtual environment.
rem Never install packages into the system Python environment.
rem ============================================================

if not exist "%PY%" (
    echo.
    echo ============================================================
    echo   HelloLabel - first run
    echo   Creating isolated Python environment: %VENV_DIR%
    echo ============================================================
    echo.

    where py >nul 2>nul
    if not errorlevel 1 (
        set "PY_LAUNCHER=py"
    ) else (
        where python >nul 2>nul
        if not errorlevel 1 (
            set "PY_LAUNCHER=python"
        ) else (
            echo [ERROR] Python was not found.
            echo Install Python 3.12 x64 and make sure py.exe or python.exe is available.
            echo No packages were installed into the system Python.
            pause
            exit /b 1
        )
    )

    echo [1/3] Creating .venv ...
    !PY_LAUNCHER! -m venv "%VENV_DIR%"
    if errorlevel 1 goto :bootstrap_fail

    if not exist "%PY%" goto :bootstrap_fail

    echo [2/3] Upgrading pip inside .venv ...
    "%PY%" -m pip install --upgrade pip
    if errorlevel 1 goto :bootstrap_fail

    echo [3/3] Installing HelloLabel base dependencies inside .venv ...
    "%PY%" -m pip install -r requirements.txt
    if errorlevel 1 goto :bootstrap_fail

    echo.
    echo [OK] HelloLabel isolated environment is ready.
    echo      AI packages are optional. Run install_ai.bat when needed.
    echo.
)

rem A venv can remain on disk after a failed/partial install. Verify the
rem base runtime instead of silently falling back to system Python.
"%PY%" -c "import fastapi, uvicorn, numpy, PIL, cv2" >nul 2>nul
if errorlevel 1 (
    echo.
    echo [INFO] HelloLabel base dependencies are missing or incomplete.
    echo        Repairing them inside .venv only ...
    "%PY%" -m pip install -r requirements.txt
    if errorlevel 1 goto :bootstrap_fail

    rem A failed AI install can leave overlapping OpenCV files inconsistent.
    rem If normal dependency repair was not enough, restore the headless build.
    "%PY%" -c "import fastapi, uvicorn, numpy, PIL, cv2" >nul 2>nul
    if errorlevel 1 (
        echo [INFO] Force-repairing HelloLabel OpenCV inside .venv ...
        "%PY%" -m pip uninstall -y opencv-python opencv-contrib-python >nul 2>nul
        "%PY%" -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.10,<5.0"
        if errorlevel 1 goto :bootstrap_fail
        "%PY%" -c "import cv2" >nul 2>nul
        if errorlevel 1 goto :bootstrap_fail
    )
)

echo.
echo ========================================
echo   HelloLabel - Web Annotation Tool
echo   http://127.0.0.1:9010
echo   Python: %PY%
echo ========================================
echo.

set "HELLOLABEL_LAUNCHER=bat"
"%PY%" run.py
set "RC=!ERRORLEVEL!"

if "!RC!"=="42" (
    echo.
    echo ============================================================
    echo   HelloLabel server has stopped.
    echo   Starting AI installer now...
    echo ============================================================
    echo.
    call "%~dp0install_ai.bat"
    set "RC=!ERRORLEVEL!"
    exit /b !RC!
)

if not "!RC!"=="0" (
    echo.
    echo [ERROR] HelloLabel failed to start. Check the message above.
    pause
)
exit /b !RC!

:bootstrap_fail
echo.
echo [ERROR] Failed to prepare HelloLabel's isolated .venv.
echo         System Python packages were not modified.
echo         You can delete the .venv folder and run start_web.bat again.
pause
exit /b 1
