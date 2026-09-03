#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
PORT="${HELLOLABEL_PORT:-9010}"

if ! command -v python3 >/dev/null 2>&1; then
  cat <<'EOF'
============================================================
  HelloLabel 1.5 - Static Web
============================================================
[ERROR] A static HTTP server is required for local development.
Production deployment does not require Python: use Nginx or any
ordinary static web server. This helper uses Python's built-in
http.server only to serve static files.
EOF
  exit 1
fi

echo "============================================================"
echo "  HelloLabel 1.5 - Static Web"
echo "  URL: http://127.0.0.1:${PORT}/static/"
echo "  Backend API: none"
echo "  Images/JSON: local browser file system only"
echo "  AI: local browser WebGPU/WASM"
echo "============================================================"

if command -v xdg-open >/dev/null 2>&1; then
  (sleep 0.4; xdg-open "http://127.0.0.1:${PORT}/static/" >/dev/null 2>&1 || true) &
elif command -v open >/dev/null 2>&1; then
  (sleep 0.4; open "http://127.0.0.1:${PORT}/static/" >/dev/null 2>&1 || true) &
fi

exec python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$PWD"
