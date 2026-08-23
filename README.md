# HelloLabel

**English** | [简体中文](README.zh-CN.md)

HelloLabel is an independent, high-performance image annotation application inspired by Labelme. It focuses on image annotation and AI-assisted annotation.

## Screenshots

![](/screenshots/1.jpg)
![](/screenshots/2.jpg)
![](/screenshots/3.jpg)

## Demo Video

[![HelloLabel demo video](https://img.youtube.com/vi/gQxBUNJIDA4/hqdefault.jpg)](https://youtu.be/gQxBUNJIDA4)

[Watch on YouTube](https://youtu.be/gQxBUNJIDA4)

## Features

- Manual tools: Pointer, Brush, Polygon, Rectangle, Oriented Rectangle, Circle, Point, Line, and Polyline.
- Pointer editing: select/move instances, drag control points to edit geometry, double-click polygon/polyline edges to insert vertices, and delete active vertices with Delete.
- Labels: add, delete, rename, and recolor labels; label changes propagate to linked instances. In the label picker, double-clicking an existing label immediately selects it and closes the dialog.
- Image list: real-time filename filtering.
- Bilingual UI: Chinese / English switching with persisted preference.
- AI toolbar: can be shown or hidden and remembers its state.
- Instance list: virtual scrolling with two-way canvas/list synchronization, auto-locate, and selection flash.
- Label rendering: Smart / All / Selected modes; instance numbers are not drawn on the image.
- Brightness / contrast: display-only adjustments. The original image and AI input are unchanged.
- Undo / Redo: `Ctrl+Z`, `Ctrl+Y`, and `Ctrl+Shift+Z`.
- Auto-save: annotation changes are saved to same-name JSON after a 300 ms debounce, while a manual Save JSON action remains available.
- Performance: WebGL2 batched rendering, image-space spatial hit grid, texture-atlas labels, and virtual lists for 1000+ annotation scenarios.
- AI: SAM / SAM2 / SAM3 interactive segmentation; YOLO11 Detect; YOLO11 Seg; YOLO-World text-guided annotation.

## Web / Source Mode

On Windows, double-click `start_web.bat`. On the first run it automatically:

1. Creates an isolated `.venv` inside the HelloLabel directory.
2. Upgrades pip through `.venv\\Scripts\\python.exe -m pip`.
3. Installs only the base dependencies from `requirements.txt` into that `.venv`.
4. Starts HelloLabel with the same isolated environment.

Later launches reuse the same `.venv`. If base dependencies are incomplete, only this local environment is repaired. HelloLabel never installs packages with the system pip and does not modify other Python projects.

Open `http://127.0.0.1:9010` in Chrome / Edge, choose **Open Folder**, and grant read/write access to the image folder.

HelloLabel uses port **9010**. Base editing does not require PyTorch or any AI model.

> Automatic folder read/write uses the File System Access API. The latest Chrome / Edge on localhost is recommended. Browsers without this API cannot provide equivalent automatic same-folder JSON saving.

## Labelme JSON

`shapes` remains Labelme-compatible. Example:

```json
{
  "version": "7.0.4",
  "flags": {},
  "shapes": [
    {
      "label": "cell",
      "points": [[10, 10], [100, 100]],
      "group_id": null,
      "description": "",
      "shape_type": "rectangle",
      "flags": {},
      "mask": null
    }
  ],
  "imagePath": "image.jpg",
  "imageData": null,
  "imageHeight": 1456,
  "imageWidth": 816,
  "hellolabel": {
    "labels": {
      "cell": {"color": "#38c172"}
    }
  }
}
```

HelloLabel only adds the top-level `hellolabel.labels` object to store label colors. The legacy `labelit` extension is accepted as an input migration format; the next save writes `hellolabel` instead. Runtime instance IDs, AI provenance, and editor-only state are not written to JSON.

Supported `shape_type` values:

- `polygon`
- `rectangle` (stored as two diagonal points)
- `oriented_rectangle` (4 points)
- `circle` (center + circumference point)
- `point`
- `line`
- `linestrip`

Brush drawings are saved as `polygon`.

## Label behavior

- If a label is selected in the right panel, new annotations use it directly.
- If no label is selected, completing a shape opens the label chooser. Choose an existing label, double-click one, or enter a new label.
- Deleting an unused label requires confirmation.
- Deleting a label that is in use requires a replacement label/new replacement label, or an explicit dangerous action to delete all linked instances.
- Renaming shows the number of linked instances and updates all of them.
- Renaming to an existing label merges into the existing label and adopts its color.
- Changing a label color immediately updates all instances using that label.

## Manual annotation controls

| Tool | Shortcut | Operation |
|---|---:|---|
| Pointer | V | Select, move, and edit control points |
| Brush | B | Click once to start; move without holding the button; return near the start to close automatically |
| Polygon | P | Click vertices; Enter or double-click to finish |
| Rectangle | R | Click one corner to start, move the mouse for a live preview, then click the opposite corner to finish |
| Oriented Rectangle | O | Click first point → click end of first edge → third click sets width |
| Circle | C | Click the center to start, move the mouse for a live preview, then click the circumference to finish |
| Point | D | Single click |
| Line | L | Two clicks |
| Polyline | K | Click vertices; Enter or double-click to finish |

Other controls:

- `Delete`: delete the active control point or selected instance.
- `Ctrl+Z`: undo.
- `Ctrl+Y` / `Ctrl+Shift+Z`: redo.
- `Esc`: cancel the current drawing / AI interaction.
- `Space + drag` or middle-button drag: pan.
- Mouse wheel: zoom around the pointer.
- In Pointer mode, double-click a polygon/polyline edge to insert a new control point.

## SAM / SAM2 / SAM3 interaction

Choose the SAM-family model and output geometry from the AI toolbar. Supported output conversions are Polygon / Rectangle / Oriented Rectangle / Circle. Circle uses the **minimum enclosing circle**.

Interaction:

- Left click: positive prompt point.
- Right click: negative prompt point.
- Left-drag: Box Prompt.
- Each new prompt refreshes prediction. The current image is cached so repeated prompts do not re-upload the full image unnecessarily.
- Backspace: remove the latest prompt.
- Enter / **Accept**: save the current AI result as a new instance.
- Esc / **Cancel**: discard the current AI interaction.

### SAM

Default `config.json`:

```json
"sam": {
  "model_type": "vit_b",
  "checkpoint": "models/sam_vit_b_01ec64.pth"
}
```

Place the checkpoint under `models/` or change the path.

### SAM2

Default configuration:

```json
"sam2": {
  "model_id": "facebook/sam2.1-hiera-small",
  "checkpoint": "",
  "config": ""
}
```

You may also configure a local checkpoint and SAM2 config file.

### SAM3

HelloLabel uses SAM3's instance-interactive predictor with SAM-style positive/negative points and box prompts. The default package may retrieve checkpoints from Hugging Face and can require access permission/login. If SAM3 is unavailable, the base application and other AI models still work.

## YOLO11 / YOLO-World

- **YOLO11 Detect**: full-image detection, saved as Labelme rectangles. The text field optionally filters exact class names such as `dog,cat,bird`; blank keeps all classes.
- **YOLO11 Seg**: instance segmentation with Polygon / Rectangle / Oriented Rectangle / Circle conversion. The text field is also an optional class filter.
- **YOLO-World**: enter text classes such as `dog,cat,bird`, configure Score and IoU, and run. Results are saved as rectangles.

Default weights:

```json
"yolo11_detect": {"weights": "yolo11n.pt"},
"yolo11_seg": {"weights": "yolo11n-seg.pt"},
"yolo_world": {"weights": "yolov8s-world.pt"}
```

Ultralytics may download missing weights on first use, or you can point each entry to a local file.

## AI installation in source/web mode

Run:

```bat
install_ai.bat
```

The source/web installer uses the same HelloLabel `.venv` as `start_web.bat`. Every pip operation explicitly uses the Python inside that environment, so other Python projects and the system Python remain untouched.

The Windows installer uses the headless OpenCV variants to avoid `opencv-python` / `opencv-python-headless` conflicts. Existing compatible PyTorch can be kept; otherwise the script chooses a CUDA 12.6 build on NVIDIA systems or a CPU build where appropriate. SAM3 failure does not prevent base editing or the other supported AI models from working.

## Performance design

HelloLabel does not create one DOM/SVG node for every annotation. Normal instances are batched through WebGL2. The SVG overlay is used only for the shape currently being created or edited and its control handles. Label text uses a texture atlas; hit testing uses an image-space grid; the instance list renders only its visible window.

The design targets smooth zooming, panning, selecting, and list scrolling with thousands of annotations. Actual performance depends on image resolution, total polygon vertex count, GPU, and browser.

## Model status and error handling

The **Model Status** action reports package availability, SAM checkpoint state, loaded/unloaded state, and missing dependency/access errors. AI models are lazy-loaded and are not all placed in VRAM at startup.

## Project layout

```text
HelloLabel/
├─ ai/
│  ├─ geometry.py
│  └─ model_manager.py
├─ desktop/
├─ models/
├─ static/
│  ├─ index.html
│  ├─ app.js
│  ├─ style.css
│  ├─ hellolabel-icon.png
│  └─ favicon.png
├─ tests/
├─ config.json
├─ run.py
├─ requirements.txt
├─ requirements-ai.txt
├─ install_ai.bat
├─ start_web.bat
└─ web_api.py
```

## Desktop packaging (Windows / macOS / Linux)

HelloLabel includes an Electron desktop shell under `desktop/`. Release packages ship a **self-contained CPython 3.12 runtime**, so installed users do **not** need to install Python, pip, venv, or PyInstaller.

- Windows: `desktop\\build_windows.bat` → NSIS installer + portable build
- macOS: `desktop/build_macos.sh` → DMG + ZIP
- Linux: `desktop/build_linux.sh` → AppImage + DEB

`desktop/prepare_runtime.py` prepares the bundled base runtime. Only `requirements.txt` is installed into it. Torch, Ultralytics, SAM/SAM2/SAM3, and model weights are **not** bundled into the release installer.

When a desktop user chooses **AI → Install AI**, HelloLabel stops the running Python backend and uses its bundled CPython to create a private `ai-runtime` under the Electron user-data directory. AI packages are installed only into that private runtime. System Python and system pip are not required or modified. On the next launch, HelloLabel uses the AI runtime when valid and safely falls back to the bundled base runtime if necessary.

Writable desktop data is stored outside the installation directory under HelloLabel user data:

```text
HelloLabel userData/
├─ ai-runtime/
├─ models/
├─ cache/
├─ config/
└─ data/
```

### GitHub Actions desktop builds

The repository contains `.github/workflows/desktop-build.yml`. The workflow is triggered **only when a Git tag matching `v*` is pushed**. Normal branch pushes, pull requests, and manual `workflow_dispatch` do not build installers.

A tag such as `v1.1.2` builds:

- Windows x64: NSIS + Portable
- macOS Apple Silicon: DMG + ZIP
- macOS Intel x64: DMG + ZIP
- Linux x64: AppImage + DEB

The workflow downloads a platform-native self-contained CPython 3.12 runtime, installs only `requirements.txt`, then packages the app with Electron Builder. It does **not** run `install_ai.*`, download Torch/SAM/YOLO, or include model weights. The completed packages are uploaded to the matching GitHub Release.

See `desktop/README.md` for desktop build details.
