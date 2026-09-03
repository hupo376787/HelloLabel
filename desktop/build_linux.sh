#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

echo "============================================================"
echo "  HelloLabel Desktop - Linux build"
echo "  Runtime: Electron + static HTML/CSS/JS only"
echo "  AI: browser-local WebGPU/WASM, downloaded on demand"
echo "============================================================"

command -v node >/dev/null || { echo "[ERROR] Node.js 22 or newer is required."; exit 1; }
command -v npm >/dev/null || { echo "[ERROR] npm is required."; exit 1; }

(
  cd desktop
  npm install --no-audit --no-fund
  npm run dist:linux -- --publish never
)

echo "[OK] Output: dist/desktop/"
echo "HelloLabel 1.5 contains no bundled Python runtime."
