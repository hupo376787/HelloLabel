from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

READY_MARKER = ".hellolabel-ai-ready.json"


def log(message: str = "") -> None:
    print(message, flush=True)


def python_executable(runtime_root: Path) -> Path:
    if os.name == "nt":
        candidates = [runtime_root / "python.exe", runtime_root / "python3.exe"]
    else:
        candidates = [
            runtime_root / "bin" / "python3.12",
            runtime_root / "bin" / "python3",
            runtime_root / "bin" / "python",
        ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f"Python executable not found under {runtime_root}")


def run(args: list[str], *, env: dict[str, str], cwd: Path | None = None, allow_failure: bool = False) -> int:
    printable = " ".join(f'"{x}"' if " " in x else x for x in args)
    log(f"> {printable}")
    proc = subprocess.run(args, cwd=cwd, env=env)
    if proc.returncode and not allow_failure:
        raise RuntimeError(f"Command failed with exit code {proc.returncode}: {printable}")
    return proc.returncode


def has_nvidia() -> bool:
    exe = shutil.which("nvidia-smi")
    if not exe:
        return False
    try:
        return subprocess.run([exe, "-L"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=8).returncode == 0
    except Exception:
        return False


def requirements_without_sam3(requirements_file: Path) -> list[str]:
    packages: list[str] = []
    for raw in requirements_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if line.lower().startswith("sam3"):
            continue
        packages.append(line)
    return packages


def install(args: argparse.Namespace) -> None:
    base_runtime = Path(args.base_runtime).resolve()
    target_runtime = Path(args.target_runtime).resolve()
    app_dir = Path(args.app_dir).resolve()
    requirements_file = app_dir / "requirements-ai.txt"

    if not base_runtime.exists():
        raise FileNotFoundError(f"Bundled Python runtime not found: {base_runtime}")
    if not requirements_file.exists():
        raise FileNotFoundError(f"AI requirements not found: {requirements_file}")

    target_runtime.parent.mkdir(parents=True, exist_ok=True)
    temp_runtime = target_runtime.with_name(target_runtime.name + ".installing")
    backup_runtime = target_runtime.with_name(target_runtime.name + ".previous")
    shutil.rmtree(temp_runtime, ignore_errors=True)
    shutil.rmtree(backup_runtime, ignore_errors=True)

    log("=" * 66)
    log("  HelloLabel Desktop AI Runtime Installer")
    log("=" * 66)
    log(f"Base Python : {base_runtime}")
    log(f"AI runtime : {target_runtime}")
    log("System Python and system pip will NOT be used.")
    log("=" * 66)
    log()

    log("[1/5] Copying HelloLabel's bundled Python runtime...")
    shutil.copytree(base_runtime, temp_runtime, symlinks=True)
    py = python_executable(temp_runtime)

    env = os.environ.copy()
    env.update({
        "PYTHONNOUSERSITE": "1",
        "PYTHONDONTWRITEBYTECODE": "1",
        "PIP_DISABLE_PIP_VERSION_CHECK": "1",
        "PIP_CACHE_DIR": str(Path(args.cache_dir).resolve() / "pip"),
        "HF_HOME": str(Path(args.cache_dir).resolve() / "huggingface"),
        "TORCH_HOME": str(Path(args.cache_dir).resolve() / "torch"),
        "YOLO_CONFIG_DIR": str(Path(args.config_dir).resolve() / "ultralytics"),
        "SAM2_BUILD_CUDA": "0" if os.name == "nt" else env.get("SAM2_BUILD_CUDA", "0"),
    })
    for key in ("PIP_CACHE_DIR", "HF_HOME", "TORCH_HOME", "YOLO_CONFIG_DIR"):
        Path(env[key]).mkdir(parents=True, exist_ok=True)

    log("[2/5] Updating the private AI runtime package installer...")
    run([str(py), "-m", "pip", "install", "--upgrade", "pip", "setuptools", "wheel"], env=env)

    log("[3/5] Installing PyTorch...")
    nvidia = has_nvidia()
    system = platform.system()
    if system in {"Windows", "Linux"} and nvidia:
        log("NVIDIA GPU detected: installing the CUDA 12.6 PyTorch build.")
        run([str(py), "-m", "pip", "install", "--upgrade", "torch", "torchvision", "--index-url", "https://download.pytorch.org/whl/cu126"], env=env)
    elif system in {"Windows", "Linux"}:
        log("No NVIDIA GPU detected: installing the CPU PyTorch build.")
        run([str(py), "-m", "pip", "install", "--upgrade", "torch", "torchvision", "--index-url", "https://download.pytorch.org/whl/cpu"], env=env)
    else:
        log("macOS detected: installing the native PyTorch build (MPS is used when available).")
        run([str(py), "-m", "pip", "install", "--upgrade", "torch", "torchvision"], env=env)

    log("[4/5] Installing YOLO, SAM and SAM2...")
    packages = requirements_without_sam3(requirements_file)
    run([str(py), "-m", "pip", "install", "--upgrade", "--prefer-binary", *packages], env=env)

    sam3_installed = False
    if system in {"Windows", "Linux"} and nvidia:
        log("Installing optional SAM3 on the NVIDIA/CUDA runtime...")
        sam3_installed = run(
            [str(py), "-m", "pip", "install", "--upgrade", "--prefer-binary", "sam3==0.1.4"],
            env=env,
            allow_failure=True,
        ) == 0
        if not sam3_installed:
            log("[WARN] SAM3 installation failed. SAM, SAM2 and YOLO remain available.")
    else:
        log("SAM3 skipped on this platform/runtime; SAM, SAM2 and YOLO remain available.")

    log("[5/5] Verifying the private AI runtime...")
    verify = (
        "import cv2, torch, ultralytics, segment_anything, sam2; "
        "print('OpenCV', cv2.__version__); "
        "print('PyTorch', torch.__version__, 'CUDA available:', torch.cuda.is_available()); "
        "print('Ultralytics', ultralytics.__version__)"
    )
    run([str(py), "-c", verify], env=env)
    run([str(py), "-m", "pip", "check"], env=env)

    marker = {
        "schema": 1,
        "product": "HelloLabel",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "python": subprocess.check_output([str(py), "-c", "import platform; print(platform.python_version())"], env=env, text=True).strip(),
        "platform": platform.platform(),
        "nvidia": nvidia,
        "sam3": sam3_installed,
    }
    (temp_runtime / READY_MARKER).write_text(json.dumps(marker, indent=2), encoding="utf-8")

    if target_runtime.exists():
        target_runtime.replace(backup_runtime)
    temp_runtime.replace(target_runtime)
    shutil.rmtree(backup_runtime, ignore_errors=True)

    log()
    log("=" * 66)
    log("[OK] HelloLabel AI runtime installation completed.")
    log("     Restart HelloLabel. It will automatically use this runtime.")
    log("=" * 66)


def main() -> int:
    parser = argparse.ArgumentParser(description="Install HelloLabel AI into a private copied Python runtime")
    parser.add_argument("--base-runtime", required=True)
    parser.add_argument("--target-runtime", required=True)
    parser.add_argument("--app-dir", required=True)
    parser.add_argument("--cache-dir", required=True)
    parser.add_argument("--config-dir", required=True)
    parser.add_argument("--interactive", action="store_true")
    args = parser.parse_args()

    code = 0
    try:
        install(args)
    except Exception as exc:
        code = 1
        log()
        log("=" * 66)
        log(f"[ERROR] AI runtime installation failed: {exc}")
        log("The base HelloLabel editor was not modified and can still start normally.")
        log("=" * 66)
    finally:
        if args.interactive:
            try:
                input("\nPress Enter to close this installer...")
            except (EOFError, KeyboardInterrupt):
                pass
    return code


if __name__ == "__main__":
    raise SystemExit(main())
