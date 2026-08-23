from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DESKTOP = ROOT / "desktop"
DOWNLOAD_DIR = DESKTOP / ".runtime-python-download"
RUNTIME_DIR = DESKTOP / "runtime"
RUNTIME_PYTHON_DIR = RUNTIME_DIR / "python"
RUNTIME_APP_DIR = RUNTIME_DIR / "app"
PYTHON_REQUEST = "3.12"


def log(message: str) -> None:
    print(f"[HelloLabel runtime] {message}", flush=True)


def run(args: list[str], *, env: dict[str, str] | None = None, cwd: Path | None = None) -> None:
    printable = " ".join(f'"{x}"' if " " in x else x for x in args)
    log(f"$ {printable}")
    subprocess.run(args, cwd=cwd or ROOT, env=env, check=True)


def runtime_python(root: Path) -> Path:
    candidates: list[Path]
    if os.name == "nt":
        candidates = [root / "python.exe", root / "python3.exe"]
    else:
        candidates = [
            root / "bin" / "python3.12",
            root / "bin" / "python3",
            root / "bin" / "python",
        ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"Python executable was not found under {root}")


def discover_managed_python(install_dir: Path) -> tuple[Path, Path]:
    if os.name == "nt":
        executables = list(install_dir.rglob("python.exe"))
    else:
        executables = list(install_dir.rglob("python3.12")) + list(install_dir.rglob("python3"))

    # Prefer the interpreter directly inside a managed Python installation, not a
    # venv or helper executable that might appear in a nested directory.
    for exe in executables:
        if os.name == "nt":
            root = exe.parent
        elif exe.parent.name == "bin":
            root = exe.parent.parent
        else:
            continue
        if (root / "lib").exists() or os.name == "nt":
            return root, exe
    raise FileNotFoundError(f"Could not locate uv-managed Python in {install_dir}")


def copy_app_payload() -> None:
    RUNTIME_APP_DIR.mkdir(parents=True, exist_ok=True)

    for name in ("run.py", "web_api.py", "config.json", "requirements.txt", "requirements-ai.txt"):
        shutil.copy2(ROOT / name, RUNTIME_APP_DIR / name)

    for folder in ("ai", "static"):
        src = ROOT / folder
        dst = RUNTIME_APP_DIR / folder
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst, symlinks=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", "*.pyo"))

    # The packaged desktop app uses this helper to create a private AI runtime
    # under Electron's per-user data directory after installation.
    shutil.copy2(DESKTOP / "desktop_ai_installer.py", RUNTIME_APP_DIR / "desktop_ai_installer.py")


def prepare(uv: Path) -> None:
    if RUNTIME_DIR.exists():
        shutil.rmtree(RUNTIME_DIR)
    if DOWNLOAD_DIR.exists():
        shutil.rmtree(DOWNLOAD_DIR)
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)

    uv_env = os.environ.copy()
    uv_env["UV_PYTHON_INSTALL_DIR"] = str(DOWNLOAD_DIR)
    uv_env["UV_PYTHON_INSTALL_BIN"] = "0"
    uv_env["UV_PYTHON_INSTALL_REGISTRY"] = "0"

    log("Downloading a relocatable CPython 3.12 runtime with uv...")
    run([str(uv), "python", "install", PYTHON_REQUEST, "--install-dir", str(DOWNLOAD_DIR)], env=uv_env)

    managed_root, _ = discover_managed_python(DOWNLOAD_DIR)
    log(f"Managed Python root: {managed_root}")

    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    shutil.copytree(managed_root, RUNTIME_PYTHON_DIR, symlinks=True)
    py = runtime_python(RUNTIME_PYTHON_DIR)

    # This is a private copy bundled inside HelloLabel, not the user's system Python.
    # uv-managed standalone runtimes are marked EXTERNALLY-MANAGED, so explicitly
    # allow package installation into this copied runtime.
    log("Installing pip and HelloLabel base dependencies into the bundled runtime...")
    run([
        str(uv), "pip", "install", "--python", str(py), "--system",
        "--break-system-packages", "--strict",
        "pip", "-r", str(ROOT / "requirements.txt"),
    ], env=uv_env)

    copy_app_payload()

    # Validate the exact interpreter that Electron will launch after installation.
    check_env = os.environ.copy()
    check_env.update({
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "HELLOLABEL_APP_DIR": str(RUNTIME_APP_DIR),
    })
    run([
        str(py), "-c",
        "import fastapi, uvicorn, numpy, PIL, cv2; "
        "import sys; sys.path.insert(0, r'%s'); import web_api; "
        "print('Bundled runtime OK:', sys.version)" % str(RUNTIME_APP_DIR).replace("'", "\\'"),
    ], env=check_env, cwd=RUNTIME_APP_DIR)

    manifest = {
        "schema": 1,
        "product": "HelloLabel",
        "python_request": PYTHON_REQUEST,
        "python_version": subprocess.check_output([str(py), "-c", "import platform; print(platform.python_version())"], text=True).strip(),
        "ai_bundled": False,
    }
    (RUNTIME_DIR / "runtime-manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    shutil.rmtree(DOWNLOAD_DIR, ignore_errors=True)
    log(f"Runtime ready: {RUNTIME_DIR}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Prepare HelloLabel's self-contained desktop Python runtime")
    parser.add_argument("--uv", required=True, help="Path to the uv executable")
    args = parser.parse_args()
    uv = Path(args.uv).resolve()
    if not uv.exists():
        raise SystemExit(f"uv executable not found: {uv}")
    prepare(uv)


if __name__ == "__main__":
    main()
