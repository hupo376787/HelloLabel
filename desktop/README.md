# HelloLabel Desktop

HelloLabel 1.5 uses one browser-first application core for Web and desktop. The desktop package wraps the same static HTML / CSS / JavaScript runtime with Electron; it no longer bundles or launches Python, FastAPI, Uvicorn, OpenCV, PyTorch, or a server-side AI runtime.

## Runtime architecture

```text
HelloLabel Desktop
├─ Electron / Chromium
├─ resources/static/
│  ├─ index.html
│  ├─ app.js
│  ├─ app-core.js
│  ├─ browser-runtime.js
│  ├─ sam-worker.js
│  └─ ...
└─ local browser runtime
   ├─ File System Access API
   ├─ WebGL2
   ├─ WebGPU / WASM
   └─ browser model cache
```

Electron starts a tiny local static HTTP server on `127.0.0.1`, normally port `19150`, and loads the bundled static UI from that stable origin. It tries a small range of adjacent ports only if the preferred port is already occupied. A single-instance lock prevents two HelloLabel desktop processes from competing for the normal port.

The stable HTTP origin is intentional: browser caches and browser-local AI storage remain reusable across application launches, while avoiding the limitations of `file://` pages.

## Local data and privacy

Images and annotation JSON are opened through Chromium's local file-system capabilities and remain on the user's device. The desktop shell does not upload image bytes to a HelloLabel backend because no backend exists in v1.5.

AI inference is browser-local:

- YOLO11 Detect: browser-local inference;
- YOLO11 Seg: browser-local inference;
- SlimSAM: browser-local interactive segmentation;
- WebGPU is preferred when available;
- CPU / WASM is used as a compatibility path when WebGPU cannot be used;
- model files download on first use and are cached by Chromium.

TIFF preview conversion is also performed in the renderer and does not require OpenCV.

## Development desktop mode

Install Node.js 22.12+ and run:

```bat
desktop\start_desktop_dev.bat
```

The development shell serves `../static` directly. No source `.venv` or Python backend is required.

## Local builds

Build machines need Node.js only.

### Windows

```bat
desktop\build_windows.bat
```

Produces NSIS + ZIP packages in `dist/desktop/`.

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

The build scripts install Electron dependencies and run electron-builder. They do not create a Python build environment and do not prepare a bundled Python runtime.

## GitHub Actions

`.github/workflows/desktop-build.yml` remains tag-only:

```yaml
on:
  push:
    tags:
      - "v*"
```

A pushed release tag builds:

- Windows x64
- macOS Apple Silicon
- macOS Intel x64
- Linux x64

The CI jobs use Node.js 22 and electron-builder only.

## Application icon

Platform icons remain under `desktop/build/`:

- Windows: `icon.ico`
- macOS: `icon.icns`
- Linux: `icons/*.png`
- Electron window fallback: `icon.png`

## Electron builder

HelloLabel pins `electron-builder` to `26.15.3` and Electron to the version specified in `desktop/package.json`.
