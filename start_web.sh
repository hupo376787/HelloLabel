#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
VENV=".venv"
PY="$VENV/bin/python"

if [[ ! -x "$PY" ]]; then
  echo "[HelloLabel] First run: creating isolated Python environment..."
  python3 -m venv "$VENV"
  "$PY" -m pip install --upgrade pip
  "$PY" -m pip install -r requirements.txt
fi

if ! "$PY" -c "import fastapi,uvicorn,numpy,PIL,cv2" >/dev/null 2>&1; then
  echo "[HelloLabel] Repairing base dependencies inside .venv..."
  "$PY" -m pip install -r requirements.txt
fi

echo "HelloLabel: http://127.0.0.1:9010"
export HELLOLABEL_LAUNCHER=sh
set +e
"$PY" run.py --host 127.0.0.1 --port 9010
RC=$?
set -e

if [[ "$RC" -eq 42 ]]; then
  echo
  echo "HelloLabel server has stopped. Starting AI installer now..."
  bash ./install_ai.sh
  exit $?
fi

exit "$RC"
