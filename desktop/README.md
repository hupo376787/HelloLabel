# HelloLabel Desktop

HelloLabel keeps the FastAPI + WebGL2 UI and wraps it with Electron for Windows, macOS and Linux.

## Runtime architecture

Release installers do **not** use a PyInstaller backend anymore. Instead each native build bundles a relocatable CPython 3.12 runtime under Electron `resources/runtime/python` and the HelloLabel Python/web sources under `resources/runtime/app`.

```text
HelloLabel installation
└─ resources/
   └─ runtime/
      ├─ python/       bundled CPython 3.12 + base requirements
      ├─ app/          run.py, web_api.py, static/, ai/, config
      └─ runtime-manifest.json
```

The installed user does not need Python, pip or a virtual environment on the system.

At runtime Electron launches the bundled interpreter with `PYTHONNOUSERSITE=1`, so unrelated user/system Python packages cannot leak into HelloLabel.

## Writable desktop data

The installation directory is treated as read-only. Models, caches and the optional AI runtime live under Electron's per-user HelloLabel data directory:

```text
HelloLabel userData/
├─ ai-runtime/
├─ models/
├─ cache/
│  ├─ pip/
│  ├─ huggingface/
│  └─ torch/
├─ config/
│  └─ ultralytics/
└─ data/
```

## Desktop AI installation

Release installers intentionally contain **no AI frameworks or model weights**. Choosing **AI → Install AI** performs this handoff:

1. Electron stops the running HelloLabel Python backend.
2. The installer launches with the bundled base Python, not a system Python.
3. `desktop_ai_installer.py` copies the bundled Python runtime to `userData/ai-runtime`.
4. PyTorch, YOLO, SAM and SAM2 are installed into that private runtime. SAM3 is attempted only on supported NVIDIA/CUDA Windows/Linux environments.
5. A `.hellolabel-ai-ready.json` marker is written after verification.
6. On the next launch Electron automatically chooses `ai-runtime`.
7. If the AI runtime cannot start, HelloLabel falls back to the bundled base runtime so manual annotation remains available.

Source/Web mode still uses the project `.venv` and `install_ai.bat` / `install_ai.sh`; that is intentionally separate from packaged desktop behavior.

## Development desktop mode

On Windows:

1. Run `start_web.bat` once so the source `.venv` exists, then close the web server.
2. Install Node.js 22.12+.
3. Run `desktop/start_desktop_dev.bat`.

Development mode uses the source `.venv`; only release installers use the bundled desktop runtime.

## Local builds

Build machines need Python 3.12 and Node.js because they create the installer. End users do not.

### Windows

```bat
desktop\build_windows.bat
```

Produces NSIS + portable packages in `dist/desktop/`.

### macOS

```bash
./desktop/build_macos.sh
```

Produces DMG + ZIP for the current Mac architecture.

### Linux

```bash
./desktop/build_linux.sh
```

Produces AppImage + DEB.

All local build scripts create `desktop/.build-venv`, install `uv`, prepare the self-contained CPython in `desktop/runtime`, then run electron-builder. Generated runtime/build folders are ignored by Git.

## GitHub Actions

`.github/workflows/desktop-build.yml` is **tag-only**:

```yaml
on:
  push:
    tags:
      - "v*"
```

Only a pushed tag such as `v0.2.14` triggers native builds for:

- Windows x64
- macOS Apple Silicon
- macOS Intel x64
- Linux x64

Normal branch pushes, PRs and manual dispatch do not build installers. CI prepares only the base runtime and does not install AI.

## Application icon

Platform icons remain under `desktop/build/`:

- Windows: `icon.ico`
- macOS: `icon.icns`
- Linux: `icons/*.png`
- Electron window fallback: `icon.png`

## Electron builder

HelloLabel pins `electron-builder` to stable `26.15.3`.
