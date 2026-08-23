#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
BUILD_VENV="desktop/.build-venv"
PY="$BUILD_VENV/bin/python"
UV="$BUILD_VENV/bin/uv"

echo "============================================================"
echo "  HelloLabel Desktop - Linux build"
echo "  Bundled CPython 3.12 runtime, no AI packages"
echo "============================================================"

if [[ ! -x "$PY" ]]; then
  python3 -m venv "$BUILD_VENV"
fi
"$PY" -m pip install --upgrade pip uv
rm -rf desktop/runtime desktop/.runtime-python-download
"$PY" desktop/prepare_runtime.py --uv "$UV"
(
  cd desktop
  npm install --no-audit --no-fund
  npm run dist:linux -- --publish never
)
echo "[OK] Output: dist/desktop/"
echo "End users do not need system Python."
