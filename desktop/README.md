# HelloLabel Desktop

HelloLabel keeps the existing FastAPI + WebGL2 web UI and adds an Electron desktop shell.
The shell starts the local HelloLabel backend on `127.0.0.1:9010`, waits for `/api/health`, then opens the app in an Electron `BrowserWindow`.

## Why this layout

- The annotation UI remains one HTML/CSS/JavaScript codebase.
- Electron embeds Chromium, so the same rendering and File System Access behavior is available on Windows, macOS and Linux.
- The Python backend is frozen with PyInstaller and bundled as an Electron extra resource.
- The Electron shell and Python backend are independent processes. Closing HelloLabel stops the backend.

## Development desktop mode (Windows)

1. Run `start_web.bat` once so `.venv` exists, then close the web server.
2. Install Node.js 22.12+.
3. Run `desktop/start_desktop_dev.bat`.

## Build Windows

Run:

```bat
desktop\build_windows.bat
```

Output is written to `dist/desktop/` (NSIS installer and portable build).

## Build macOS

On a Mac:

```bash
chmod +x desktop/build_macos.sh
./desktop/build_macos.sh
```

The build uses the current Mac architecture. Build Intel on an Intel Mac and Apple Silicon on an Apple Silicon Mac, or configure a dedicated universal build pipeline with matching Python backends for both architectures.

## Build Linux

On Linux:

```bash
chmod +x desktop/build_linux.sh
./desktop/build_linux.sh
```

Output includes AppImage and deb packages.

## AI in desktop builds

Current desktop release builds are **base-editor only**. AI is intentionally excluded from the PyInstaller sidecar even when the local `.venv` already has Torch, Ultralytics, SAM, SAM2 or SAM3 installed. Model weights under `models/` are not bundled either. This keeps GitHub Actions and local installers smaller and deterministic.

The source/Web edition can still install AI with `install_ai.bat` / `install_ai.sh`. A future desktop-specific downloadable AI runtime can be added without changing the annotation UI.

## GitHub Actions

`.github/workflows/desktop-build.yml` builds installers without AI on native GitHub-hosted runners:

- `windows-2025` -> Windows x64 NSIS + portable
- `macos-26` -> macOS Apple Silicon DMG + ZIP
- `macos-26-intel` -> macOS Intel x64 DMG + ZIP
- `ubuntu-24.04` -> Linux x64 AppImage + DEB

The workflow is intentionally **tag-only**. It runs only when a Git tag matching `v*` is pushed (for example `v0.2.5`). Branch pushes, pull requests, and manual `workflow_dispatch` do not build desktop installers. A matching tag build also creates/updates the corresponding GitHub Release and uploads the generated installers.

## Application icon

`desktop/build/icon-master.png` is the master icon with transparent pixels outside the rounded-square tile. Platform files are generated from it:

- Windows: `desktop/build/icon.ico`
- macOS: `desktop/build/icon.icns`
- Linux: `desktop/build/icons/*.png`
- Electron window/fallback: `desktop/build/icon.png`


## Electron builder version

HelloLabel pins `electron-builder` to stable `26.15.3`. Do not change it to `27.0.0`: as of the v0.2.5 build, npm has no stable `electron-builder@27.0.0` package (v27 is pre-release).

If a previous failed install left npm metadata in the desktop folder, delete `desktop/node_modules` and `desktop/package-lock.json`, then run `build_windows.bat` again.
