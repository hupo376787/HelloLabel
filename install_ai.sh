#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PY=".venv/bin/python"

if [[ ! -x "$PY" ]]; then
  python3 -m venv .venv
  "$PY" -m pip install --upgrade pip
  "$PY" -m pip install -r requirements.txt
fi

echo "[HelloLabel] Installing AI packages into $PWD/.venv only..."
"$PY" -m pip install --upgrade torch torchvision
"$PY" -m pip install --upgrade ultralytics-opencv-headless huggingface_hub segment-anything-py==1.0.1 RF-SAM-2==1.0.3

case "$(uname -s)" in
  Linux)
    if command -v nvidia-smi >/dev/null 2>&1; then
      echo "[HelloLabel] NVIDIA detected; attempting optional SAM3 install..."
      "$PY" -m pip install --upgrade sam3==0.1.4 || echo "[WARN] SAM3 install failed; other AI models remain available."
    else
      echo "[HelloLabel] SAM3 skipped: no NVIDIA/CUDA environment detected."
    fi
    ;;
  Darwin)
    echo "[HelloLabel] SAM3 skipped on macOS; SAM, SAM2 and YOLO remain available."
    ;;
  *)
    echo "[HelloLabel] SAM3 skipped on this platform."
    ;;
esac

"$PY" -m pip check || true
