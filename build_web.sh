#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
OUT="dist/web"

printf '%s\n' \
  '============================================================' \
  '  HelloLabel 2.1 - Build Static Web Distribution' \
  '============================================================'

rm -rf "$OUT"
mkdir -p "$OUT/static"
cp -R static/. "$OUT/static/"
cp static/index.html "$OUT/index.html"
rm -f "$OUT/static/index.html"
printf '%s\n' 'HelloLabel 2.1.0 - browser-only static runtime' > "$OUT/VERSION.txt"

echo "[OK] Static site created at $OUT"
echo "Upload the CONTENTS of $OUT to your Nginx document root."
echo "No Python, FastAPI, Uvicorn, OpenCV or server-side AI is required."
