from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import uvicorn


def resource_root() -> Path:
    """Return the project/resource directory in source and PyInstaller builds."""
    if getattr(sys, "frozen", False):
        return Path(getattr(sys, "_MEIPASS", Path(sys.executable).resolve().parent))
    return Path(__file__).resolve().parent


BASE_DIR = resource_root()
CONFIG_PATH = BASE_DIR / "config.json"


def load_server_config() -> dict:
    if not CONFIG_PATH.exists():
        return {}
    try:
        return json.loads(CONFIG_PATH.read_text(encoding="utf-8")).get("server", {})
    except Exception:
        return {}


def parse_args() -> argparse.Namespace:
    server = load_server_config()
    parser = argparse.ArgumentParser(description="HelloLabel local web server")
    parser.add_argument("--host", default=os.environ.get("LABELIT_HOST", str(server.get("host", "127.0.0.1"))))
    parser.add_argument("--port", type=int, default=int(os.environ.get("LABELIT_PORT", server.get("port", 9010))))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    # Import after resolving resource paths so a frozen executable can load data.
    from web_api import app

    uvicorn.run(app, host=args.host, port=args.port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
