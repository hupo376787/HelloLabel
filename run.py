from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

import uvicorn


def resource_root() -> Path:
    """Return the HelloLabel application resource directory.

    Packaged Electron builds launch the bundled CPython with HELLOLABEL_APP_DIR
    pointing at resources/runtime/app. Source mode falls back to this file's
    directory; legacy PyInstaller builds are still understood for compatibility.
    """
    desktop_app_dir = os.environ.get("HELLOLABEL_APP_DIR", "").strip()
    if desktop_app_dir:
        return Path(desktop_app_dir).resolve()
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
    host_env = os.environ.get("HELLOLABEL_HOST") or os.environ.get("LABELIT_HOST")
    port_env = os.environ.get("HELLOLABEL_PORT") or os.environ.get("LABELIT_PORT")
    parser.add_argument("--host", default=host_env or str(server.get("host", "127.0.0.1")))
    parser.add_argument("--port", type=int, default=int(port_env or server.get("port", 9010)))
    return parser.parse_args()


def install_ui_extensions(app) -> None:
    """Add small UI extensions without delaying the lightweight API startup."""
    from fastapi.responses import HTMLResponse

    index_path = BASE_DIR / "static" / "index.html"
    try:
        index_html = index_path.read_text(encoding="utf-8")
    except Exception:
        return

    style = '<link rel="stylesheet" href="/static/theme-workspace.css?v=hellolabel-v132">'
    if style not in index_html:
        index_html = index_html.replace("</head>", f"  {style}\n</head>")

    scripts = [
        '<script src="/static/hover.js?v=hellolabel-hover-v1"></script>',
        '<script src="/static/workspace-ui.js?v=hellolabel-workspace-v1"></script>',
        '<script src="/static/instance-delete.js?v=hellolabel-instance-delete-v1"></script>',
        '<script src="/static/drawing-undo.js?v=hellolabel-drawing-undo-v1"></script>',
    ]
    for script in scripts:
        if script not in index_html:
            index_html = index_html.replace("</body>", f"  {script}\n</body>")

    @app.middleware("http")
    async def serve_extended_index(request, call_next):
        if request.method == "GET" and request.url.path == "/":
            return HTMLResponse(index_html, headers={"Cache-Control": "no-cache"})
        return await call_next(request)


def main() -> None:
    args = parse_args()
    # Import after resolving resource paths so a frozen executable can load data.
    from web_api import app

    install_ui_extensions(app)
    uvicorn.run(app, host=args.host, port=args.port, reload=False, log_level="info")


if __name__ == "__main__":
    main()
