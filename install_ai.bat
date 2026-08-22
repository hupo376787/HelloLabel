@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
title HelloLabel AI Installer

set "VENV_DIR=.venv"
set "PY=%VENV_DIR%\Scripts\python.exe"
set "PY_LAUNCHER="
set "HELLOLABEL_RUNNING=0"

rem ============================================================
rem AI dependencies are installed ONLY into HelloLabel's local .venv.
rem This script never calls system pip and never modifies other projects.
rem ============================================================

if not exist "%PY%" (
    echo.
    echo [INFO] HelloLabel .venv does not exist yet.
    echo        Creating the same isolated environment used by start_web.bat ...

    where py >nul 2>nul
    if not errorlevel 1 (
        set "PY_LAUNCHER=py"
    ) else (
        where python >nul 2>nul
        if not errorlevel 1 (
            set "PY_LAUNCHER=python"
        ) else (
            echo [ERROR] Python was not found.
            echo Install Python 3.12 x64 first.
            pause
            exit /b 1
        )
    )

    !PY_LAUNCHER! -m venv "%VENV_DIR%"
    if errorlevel 1 goto :fail

    "%PY%" -m pip install --upgrade pip
    if errorlevel 1 goto :fail

    "%PY%" -m pip install -r requirements.txt
    if errorlevel 1 goto :fail
)

rem Do not modify packages while the HelloLabel server is using cv2/torch DLLs.
for /f %%I in ('powershell -NoProfile -Command "$c=Get-NetTCPConnection -State Listen -LocalPort 9010 -ErrorAction SilentlyContinue; if($c){Write-Output 1}else{Write-Output 0}" 2^>nul') do set "HELLOLABEL_RUNNING=%%I"
if "!HELLOLABEL_RUNNING!"=="1" (
    echo.
    echo ============================================================
    echo [ERROR] HelloLabel is currently running on port 9010.
    echo         Close the start_web.bat / HelloLabel server window first,
    echo         then run install_ai.bat again.
    echo.
    echo         Windows locks cv2.pyd while HelloLabel is running. Installing
    echo         OpenCV/Ultralytics at the same time can cause WinError 5.
    echo ============================================================
    pause
    exit /b 3
)

rem Make sure the base environment is complete before adding AI packages.
"%PY%" -c "import fastapi, uvicorn, numpy, PIL, cv2" >nul 2>nul
if errorlevel 1 (
    echo [INFO] Repairing HelloLabel base dependencies inside .venv ...
    "%PY%" -m pip install -r requirements.txt
    if errorlevel 1 goto :fail
    "%PY%" -c "import fastapi, uvicorn, numpy, PIL, cv2" >nul 2>nul
    if errorlevel 1 (
        echo [INFO] OpenCV files may have been left inconsistent by a previous failed install.
        echo        Force-repairing opencv-python-headless ...
        "%PY%" -m pip uninstall -y opencv-python opencv-contrib-python >nul 2>nul
        "%PY%" -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.10,<5.0"
        if errorlevel 1 goto :fail
        "%PY%" -c "import cv2" >nul 2>nul
        if errorlevel 1 goto :fail
    )
)

echo.
echo ============================================================
echo   HelloLabel AI dependencies
echo   Target environment: %CD%\%VENV_DIR%
echo ============================================================
echo   All pip operations below use:
echo   %PY% -m pip
echo.
echo   HelloLabel uses OpenCV HEADLESS consistently.
echo   Git is NOT required. SAM/SAM2/SAM3 are installed from PyPI wheels.
echo ============================================================
echo.

rem A previous failed install of the normal ultralytics package may have left
rem opencv-python beside opencv-python-headless. They share the same cv2 files.
rem Remove only the GUI OpenCV variant and restore HelloLabel's headless build.
"%PY%" -m pip list --format=freeze 2>nul | findstr /b /i "opencv-python==" >nul
if not errorlevel 1 (
    echo [INFO] Removing conflicting opencv-python from a previous install ...
    "%PY%" -m pip uninstall -y opencv-python
    if errorlevel 1 goto :fail
    echo [INFO] Restoring opencv-python-headless ...
    "%PY%" -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.10,<5.0"
    if errorlevel 1 goto :fail
)

"%PY%" -m pip list --format=freeze 2>nul | findstr /b /i "opencv-contrib-python==" >nul
if not errorlevel 1 (
    echo [INFO] Removing conflicting opencv-contrib-python ...
    "%PY%" -m pip uninstall -y opencv-contrib-python
    if errorlevel 1 goto :fail
    "%PY%" -m pip install --force-reinstall --no-deps "opencv-python-headless>=4.10,<5.0"
    if errorlevel 1 goto :fail
)

rem Install/validate PyTorch first. SAM3 requires PyTorch >= 2.7 and CUDA 12.6+.
rem We keep a sufficiently new existing build. On NVIDIA systems without one,
rem install the CUDA 12.6 wheel. This is still isolated inside HelloLabel .venv.
"%PY%" -c "import torch; from packaging.version import Version; v=Version(torch.__version__.split('+')[0]); print('[INFO] Existing PyTorch:', torch.__version__); raise SystemExit(0 if v >= Version('2.7') else 1)" >nul 2>nul
if errorlevel 1 (
    where nvidia-smi >nul 2>nul
    if not errorlevel 1 (
        echo [INFO] Installing/upgrading PyTorch CUDA 12.6 build for SAM2/SAM3 ...
        "%PY%" -m pip install --upgrade torch torchvision --index-url https://download.pytorch.org/whl/cu126
        if errorlevel 1 goto :fail
    ) else (
        echo [INFO] NVIDIA GPU not detected. Installing/upgrading PyTorch CPU build ...
        "%PY%" -m pip install --upgrade torch torchvision --index-url https://download.pytorch.org/whl/cpu
        if errorlevel 1 goto :fail
    )
) else (
    echo [INFO] Existing PyTorch 2.7+ detected; keeping it.
)

"%PY%" -c "import torch; print('[INFO] PyTorch:', torch.__version__, '| CUDA runtime:', torch.version.cuda, '| CUDA available:', torch.cuda.is_available())"
if errorlevel 1 goto :fail

echo.
echo [1/4] Installing Ultralytics headless + Hugging Face Hub ...
rem Official Ultralytics headless package depends on opencv-python-headless,
rem avoiding the opencv-python/cv2.pyd conflict that caused WinError 5.
"%PY%" -m pip install --upgrade ultralytics-opencv-headless huggingface_hub
if errorlevel 1 goto :fail

"%PY%" -c "import cv2, ultralytics; print('[OK] OpenCV:', cv2.__version__, '| Ultralytics:', ultralytics.__version__)"
if errorlevel 1 goto :fail

echo.
echo [2/4] Installing SAM ...
rem Avoid a hard dependency on git/GitHub TLS. segment-anything-py packages
rem the original Segment Anything Python API and still imports as segment_anything.
"%PY%" -m pip install --upgrade --prefer-binary "segment-anything-py==1.0.1"
if errorlevel 1 goto :fail
"%PY%" -c "from segment_anything import SamPredictor, sam_model_registry; print('[OK] SAM Python API ready')"
if errorlevel 1 goto :fail

echo.
echo [3/4] Installing SAM2 ...
rem RF-SAM-2 is a PyPI-packaged SAM2 distribution. Skip the optional CUDA
rem connected-components extension on Windows; image prediction still works.
set "SAM2_BUILD_CUDA=0"
"%PY%" -m pip install --upgrade --prefer-binary "RF-SAM-2==1.0.3"
if errorlevel 1 goto :fail
"%PY%" -c "from sam2.sam2_image_predictor import SAM2ImagePredictor; print('[OK] SAM2 Python API ready')"
if errorlevel 1 goto :fail

echo.
echo [4/4] Installing SAM3 ...
rem SAM3 is optional. PyPI avoids the same GitHub clone/TLS failure and keeps
rem installation reproducible. Model access on Hugging Face is still required.
"%PY%" -m pip install --upgrade --prefer-binary "sam3==0.1.4"
if errorlevel 1 goto :sam3fail
"%PY%" -c "from sam3.model_builder import build_sam3_image_model; print('[OK] SAM3 Python API ready')"
if errorlevel 1 goto :sam3fail

echo.
echo [INFO] Checking installed package consistency ...
"%PY%" -m pip check
if errorlevel 1 goto :fail

echo.
echo [OK] AI packages were installed into HelloLabel's .venv only.
echo      Model weights may still need to be downloaded/configured.
pause
exit /b 0

:sam3fail
echo.
echo [WARN] SAM / SAM2 / YOLO were installed into HelloLabel's .venv,
echo        but SAM3 installation failed.
echo        This does NOT prevent HelloLabel base editing from running.
echo        See README.md for SAM3 requirements.
pause
exit /b 2

:fail
echo.
echo [ERROR] AI dependency installation failed.
echo         HelloLabel base editing can still work.
echo         System Python packages were not modified.
echo.
echo         If the error mentions cv2.pyd / WinError 5, make sure the
echo         HelloLabel server is completely closed, then run install_ai.bat again.
echo         If the error is a network/TLS error, this installer no longer needs
echo         git or GitHub; verify that pypi.org/files.pythonhosted.org and
echo         download.pytorch.org are reachable.
pause
exit /b 1
