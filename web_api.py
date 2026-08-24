from __future__ import annotations

import io
import json
import hashlib
import threading
import sys
import os
import shutil
import subprocess
import time
from collections import OrderedDict
from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, JSONResponse, Response
from fastapi.staticfiles import StaticFiles

_desktop_app_dir = os.environ.get("HELLOLABEL_APP_DIR", "").strip()
if _desktop_app_dir:
    BASE_DIR = Path(_desktop_app_dir).resolve()
elif getattr(sys, "frozen", False):
    BASE_DIR = Path(getattr(sys, "_MEIPASS", Path(__file__).resolve().parent))
else:
    BASE_DIR = Path(__file__).resolve().parent

DATA_DIR = Path(os.environ.get("HELLOLABEL_DATA_DIR", str(BASE_DIR))).resolve()
MODEL_DIR = Path(os.environ.get("HELLOLABEL_MODEL_DIR", str(DATA_DIR / "models"))).resolve()
STATIC_DIR = BASE_DIR / "static"
CONFIG_PATH = BASE_DIR / "config.json"


def load_config() -> dict[str, Any]:
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
    return {}


CONFIG = load_config()
_MODEL_MANAGER: Any | None = None
_MODEL_MANAGER_LOCK = threading.Lock()


def _get_model_manager() -> Any:
    """Create the AI manager only when model status/inference is actually used.

    Importing the AI module also imports OpenCV/NumPy/Pillow. Deferring that work
    keeps the lightweight health/static server available much earlier during
    packaged desktop startup.
    """
    global _MODEL_MANAGER
    if _MODEL_MANAGER is not None:
        return _MODEL_MANAGER
    with _MODEL_MANAGER_LOCK:
        if _MODEL_MANAGER is None:
            from ai import ModelManager

            _MODEL_MANAGER = ModelManager(BASE_DIR, CONFIG, model_dir=MODEL_DIR)
    return _MODEL_MANAGER


_AI_IMAGE_CACHE: "OrderedDict[str, bytes]" = OrderedDict()
_AI_IMAGE_CACHE_BYTES = 0
_AI_IMAGE_CACHE_LOCK = threading.RLock()
_AI_IMAGE_CACHE_MAX_ITEMS = 4
_AI_IMAGE_CACHE_MAX_BYTES = 256 * 1024 * 1024


def _cache_ai_image(data: bytes) -> str:
    global _AI_IMAGE_CACHE_BYTES
    token = hashlib.sha256(data).hexdigest()
    with _AI_IMAGE_CACHE_LOCK:
        old = _AI_IMAGE_CACHE.pop(token, None)
        if old is not None:
            _AI_IMAGE_CACHE_BYTES -= len(old)
        _AI_IMAGE_CACHE[token] = data
        _AI_IMAGE_CACHE_BYTES += len(data)
        _AI_IMAGE_CACHE.move_to_end(token)
        while len(_AI_IMAGE_CACHE) > _AI_IMAGE_CACHE_MAX_ITEMS or (_AI_IMAGE_CACHE_BYTES > _AI_IMAGE_CACHE_MAX_BYTES and len(_AI_IMAGE_CACHE) > 1):
            _, removed = _AI_IMAGE_CACHE.popitem(last=False)
            _AI_IMAGE_CACHE_BYTES -= len(removed)
    return token


def _cached_ai_image(token: str) -> bytes | None:
    if not token:
        return None
    with _AI_IMAGE_CACHE_LOCK:
        data = _AI_IMAGE_CACHE.get(token)
        if data is not None:
            _AI_IMAGE_CACHE.move_to_end(token)
        return data


async def _resolve_ai_image(file: UploadFile | None, image_token: str) -> tuple[bytes, str]:
    if file is not None:
        data = await file.read()
        if not data:
            raise HTTPException(status_code=400, detail="Uploaded image is empty")
        return data, _cache_ai_image(data)
    data = _cached_ai_image(image_token)
    if data is None:
        raise HTTPException(status_code=410, detail="AI image cache expired; resend the image")
    return data, image_token


app = FastAPI(title="HelloLabel", version="0.2.14")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html", headers={"Cache-Control": "no-cache"})


@app.get("/favicon.ico", include_in_schema=False)
def favicon() -> FileResponse:
    return FileResponse(STATIC_DIR / "favicon.ico", media_type="image/x-icon", headers={"Cache-Control": "no-cache, must-revalidate"})


@app.get("/api/health")
def health() -> dict[str, Any]:
    return {"ok": True, "app": "HelloLabel", "version": "0.2.14"}


@app.get("/api/models")
def models() -> dict[str, Any]:
    return {"models": _get_model_manager().statuses()}


def _launch_source_ai_installer() -> None:
    if getattr(sys, "frozen", False):
        raise RuntimeError("Runtime AI installation is unavailable in the packaged backend")

    root = Path(__file__).resolve().parent
    if sys.platform.startswith("win"):
        script = root / "install_ai.bat"
        if not script.exists():
            raise RuntimeError("install_ai.bat was not found")

        # Launch the batch file DIRECTLY in a brand-new visible console window.
        # The previous PowerShell Start-Process wrapper could report success even
        # when cmd.exe never actually opened because of nested-quote parsing.
        # A short delay lets FastAPI finish this response and exit before the
        # installer checks port 9010 / updates cv2 and torch DLLs.
        comspec = os.environ.get("COMSPEC") or "cmd.exe"
        command = 'echo [HelloLabel] Waiting for the web server to stop... & timeout /t 3 /nobreak >nul & call install_ai.bat'
        flags = (
            getattr(subprocess, "CREATE_NEW_CONSOLE", 0)
            | getattr(subprocess, "CREATE_NEW_PROCESS_GROUP", 0)
        )
        subprocess.Popen(
            [comspec, "/d", "/k", command],
            cwd=root,
            creationflags=flags,
            close_fds=True,
        )
        return

    script = root / "install_ai.sh"
    if not script.exists():
        raise RuntimeError("install_ai.sh was not found")
    delayed = f"sleep 2; cd {shlex_quote(str(root))}; bash ./install_ai.sh"
    if sys.platform == "darwin":
        subprocess.Popen(["osascript", "-e", f'tell application "Terminal" to do script {json.dumps(delayed)}'])
        return

    terminal = next((name for name in ("x-terminal-emulator", "gnome-terminal", "konsole") if shutil.which(name)), None)
    if terminal == "x-terminal-emulator":
        subprocess.Popen([terminal, "-e", "bash", "-lc", delayed], cwd=root)
    elif terminal == "gnome-terminal":
        subprocess.Popen([terminal, "--", "bash", "-lc", delayed], cwd=root)
    elif terminal == "konsole":
        subprocess.Popen([terminal, "-e", "bash", "-lc", delayed], cwd=root)
    else:
        subprocess.Popen(["bash", "-lc", delayed], cwd=root, start_new_session=True)


def shlex_quote(value: str) -> str:
    import shlex
    return shlex.quote(value)


AI_INSTALL_EXIT_CODE = 42


def _exit_process_after_response(code: int = 0) -> None:
    # Give FastAPI enough time to flush the HTTP response before terminating.
    time.sleep(0.8)
    os._exit(code)


@app.post("/api/system/install-ai")
def install_ai(background_tasks: BackgroundTasks) -> dict[str, Any]:
    # When HelloLabel was started by start_web.bat/start_web.sh, do NOT spawn
    # install_ai from inside the running Python process. On Windows that created
    # a race between the new console and the still-listening 9010 server, and a
    # quoting/startup failure could leave the browser disconnected with no installer.
    # Instead exit with a dedicated code; the parent launcher starts install_ai only
    # after run.py has fully terminated and released cv2/torch DLLs and port 9010.
    launcher = os.environ.get("HELLOLABEL_LAUNCHER", "").strip().lower()
    if launcher in {"bat", "sh"}:
        background_tasks.add_task(_exit_process_after_response, AI_INSTALL_EXIT_CODE)
        return {
            "ok": True,
            "message": "HelloLabel is stopping; the parent launcher will start the AI installer.",
            "handoff": True,
        }

    # Fallback for developers who started `python run.py` directly. In this case
    # there is no parent launcher to perform the handoff, so open a separate
    # installer terminal and then stop this server.
    try:
        _launch_source_ai_installer()
    except Exception as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    background_tasks.add_task(_exit_process_after_response, 0)
    return {"ok": True, "message": "AI installer launched; HelloLabel will stop safely.", "handoff": False}


def _decode_preview(data: bytes) -> tuple[Any, int, int]:
    # OpenCV/NumPy/Pillow are relatively expensive to import from a bundled
    # runtime on Windows (especially with real-time antivirus scanning). Import
    # them on the first image operation instead of blocking desktop startup.
    import cv2
    import numpy as np
    from PIL import Image

    arr = np.frombuffer(data, np.uint8)
    bgr = cv2.imdecode(arr, cv2.IMREAD_UNCHANGED)
    if bgr is None:
        image = Image.open(io.BytesIO(data)).convert("RGB")
        rgb = np.asarray(image)
        bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
    if bgr.ndim == 2:
        bgr = cv2.cvtColor(bgr, cv2.COLOR_GRAY2BGR)
    elif bgr.ndim == 3 and bgr.shape[2] == 4:
        bgr = cv2.cvtColor(bgr, cv2.COLOR_BGRA2BGR)
    h, w = bgr.shape[:2]
    ok, encoded = cv2.imencode(".png", bgr, [cv2.IMWRITE_PNG_COMPRESSION, 2])
    if not ok:
        raise ValueError("Image preview encoding failed")
    return encoded, w, h


@app.post("/api/preview")
async def preview(file: UploadFile = File(...)) -> Response:
    try:
        data = await file.read()
        token = _cache_ai_image(data)
        encoded, width, height = _decode_preview(data)
        return Response(
            content=encoded.tobytes(),
            media_type="image/png",
            headers={
                "X-Image-Width": str(width),
                "X-Image-Height": str(height),
                "X-AI-Image-Token": token,
                "Cache-Control": "no-store",
            },
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Preview failed: {exc}") from exc


@app.post("/api/ai/sam")
async def ai_sam(
    model: str = Form(...),
    file: UploadFile | None = File(None),
    image_token: str = Form(""),
    points: str = Form("[]"),
    point_labels: str = Form("[]"),
    box: str = Form("null"),
    output_shape: str = Form("polygon"),
) -> JSONResponse:
    try:
        image_bytes, resolved_token = await _resolve_ai_image(file, image_token)
        point_values = json.loads(points)
        label_values = json.loads(point_labels)
        box_value = json.loads(box)
        if len(point_values) != len(label_values):
            raise ValueError("points and point_labels length mismatch")
        if not point_values and not box_value:
            raise ValueError("Add at least one point or box prompt")
        result = _get_model_manager().predict_sam(
            model_id=model,
            image_bytes=image_bytes,
            points=point_values,
            point_labels=label_values,
            box=box_value,
            output_shape=output_shape,
        )
        return JSONResponse({"shape": result, "image_token": resolved_token})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{model} inference failed: {exc}") from exc


@app.post("/api/ai/yolo")
async def ai_yolo(
    model: str = Form(...),
    file: UploadFile | None = File(None),
    image_token: str = Form(""),
    text: str = Form(""),
    conf: float = Form(0.25),
    iou: float = Form(0.50),
    output_shape: str = Form("polygon"),
) -> JSONResponse:
    try:
        image_bytes, resolved_token = await _resolve_ai_image(file, image_token)
        classes = [x.strip() for x in text.replace("，", ",").split(",") if x.strip()]
        shapes = _get_model_manager().predict_yolo(
            model_id=model,
            image_bytes=image_bytes,
            text_classes=classes,
            conf=max(0.001, min(1.0, conf)),
            iou=max(0.001, min(1.0, iou)),
            output_shape=output_shape,
        )
        return JSONResponse({"shapes": shapes, "image_token": resolved_token})
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"{model} inference failed: {exc}") from exc