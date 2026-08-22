#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
PY=".venv/bin/python"

echo "============================================================"
echo "  HelloLabel Desktop - macOS build"
echo "============================================================"

if [[ ! -x "$PY" ]]; then
  python3 -m venv .venv
  "$PY" -m pip install --upgrade pip
  "$PY" -m pip install -r requirements.txt
fi
"$PY" -m pip install --upgrade pyinstaller
rm -rf desktop/backend-build desktop/backend-dist
"$PY" -m PyInstaller desktop/hellolabel-server.spec --noconfirm --clean --workpath desktop/backend-build --distpath desktop/backend-dist
(
  cd desktop
  npm install
  npm run dist:mac
)
echo "[OK] Output: dist/desktop/"
