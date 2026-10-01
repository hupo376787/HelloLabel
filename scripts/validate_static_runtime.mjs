import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const exists = relative => fs.existsSync(path.join(root, relative));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const app = read("static/app.js");
const appCore = read("static/app-core.js");
const i18nCore = read("static/i18n/i18n.js");
const i18nZh = read("static/i18n/zh.js");
const i18nEn = read("static/i18n/en.js");
const coreUtils = read("static/core/utils.js");
const labelmeModel = read("static/core/labelme-model.js");
const annotationCommit = read("static/annotation/annotation-commit.js");
const samController = read("static/ai/sam-controller.js");
const yoloController = read("static/ai/yolo-controller.js");
const languageTheme = read("static/ui/language-theme.js");
const layoutController = read("static/ui/layout-controller.js");
const helpMenu = read("static/ui/help-menu.js");
const viewportController = read("static/view/viewport-controller.js");
const statusUi = read("static/ui/status-ui.js");
const historyManager = read("static/core/history-manager.js");
const jsonStorage = read("static/io/json-storage.js");
const folderController = read("static/io/folder-controller.js");
const geometryUtils = read("static/render/geometry-utils.js");
const webglRenderer = read("static/render/webgl-renderer.js");
const renderCache = read("static/render/render-cache.js");
const viewportRenderer = read("static/render/viewport-renderer.js");
const selectionOverlay = read("static/render/selection-overlay.js");
const hitTest = read("static/render/hit-test.js");
const drawingPreview = read("static/drawing-preview.js");
const drawingDispatcher = read("static/tools/drawing-dispatcher.js");
const circleTool = read("static/tools/circle-tool.js");
const lineTool = read("static/tools/line-tool.js");
const pointTool = read("static/tools/point-tool.js");
const pointerInput = read("static/pointer-input.js");
const index = read("static/index.html");
const aboutUi = read("static/about-ui.js");
const telemetry = read("static/telemetry.js");
const browserRuntime = read("static/browser-runtime.js");
const browserFileGuard = read("static/browser-file-guard.js");
const mobileFolderCompat = read("static/mobile-folder-compat.js");
const browserSam = read("static/browser-sam-runtime.js");
const browserYolo = read("static/browser-yolo-runtime.js");
const browserRuntimeUi = read("static/browser-runtime-ui.js");
const orientedRectDirection = read("static/oriented-rect-direction.js");
const viewportContextMenu = read("static/viewport-context-menu.js");
const samMaskUtils = read("static/sam-mask-utils.js");
const samWorker = read("static/sam-worker.js");
const privacyGuard = read("static/browser-privacy-guard.js");
const desktopMain = read("desktop/main.cjs");
const desktopPackage = JSON.parse(read("desktop/package.json"));
const workflow = read(".github/workflows/desktop-build.yml");
const startBat = read("start_web.bat");
const startSh = read("start_web.sh");

// Release identity.
assert(desktopPackage.version === "2.2.0", "desktop/package.json must be version 2.2.0");
assert(app.includes('const VERSION = "hellolabel-v220'), "app bootstrap cache version must use hellolabel-v220");
assert(app.includes('version: "2.2.0"'), "app ready event must report version 2.2.0");
assert(app.includes("pointer-input.js"), "app bootstrap must load the pointer input layer");
assert(pointerInput.includes("mouse: Object.freeze") && pointerInput.includes("touch: Object.freeze") && pointerInput.includes("pen: Object.freeze"), "pointer-input.js must define mouse/touch/pen profiles");
assert(pointerInput.includes("activePointers = new Map"), "pointer-input.js must track active pointers");
assert(pointerInput.includes("beginTwoFingerPan") && pointerInput.includes("pointerDistance"), "pointer-input.js must support two-finger pan/pinch");
assert(pointerInput.includes("hellolabel-touch-actions") && pointerInput.includes("sam-negative"), "pointer-input.js must provide touch completion/context alternatives");
assert(browserRuntime.includes('const RUNTIME_VERSION = "2.2.0"'), "browser runtime must report version 2.2.0");
assert(aboutUi.includes('const APP_VERSION = "2.2.0"'), "About dialog must report version 2.2.0");
assert(telemetry.includes('let appVersion = "2.2.0"'), "telemetry fallback version must report 2.2.0");

// Browser-only architecture and desktop packaging boundaries.
assert(desktopPackage.build?.extraResources?.some(item => item.from === "../static" && item.to === "static"), "desktop package must bundle ../static as resources/static");
assert(!JSON.stringify(desktopPackage.build?.extraResources || []).includes("runtime"), "desktop package must not bundle a Python runtime");
assert(!/child_process|spawn\s*\(|execFile\s*\(|exec\s*\(|web_api\.py|run\.py|fastapi|uvicorn/i.test(desktopMain), "desktop/main.cjs must not launch Python/FastAPI");
assert(/Cross-Origin-Opener-Policy/.test(desktopMain) && /Cross-Origin-Embedder-Policy/.test(desktopMain), "desktop static server must expose browser-AI isolation headers");
assert(desktopMain.includes("flushRendererSaveBeforeQuit") && desktopMain.includes("flushPendingSave"), "desktop quit flow must flush pending renderer saves before exit");
assert(!/prepare_runtime|setup-python|pip install|\buv\b/i.test(workflow), "desktop CI must not prepare Python runtime");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startBat), "start_web.bat must be static-server only");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startSh), "start_web.sh must be static-server only");

// Core browser runtime / local AI invariants.
assert(browserRuntime.includes('mode: "browser-only"'), "browser-runtime.js must declare browser-only mode");
assert(browserRuntime.includes("interactionSeq"), "browser runtime must keep a non-resetting SAM interaction generation");
assert(!/SlimSAM|slimsam|@xenova\/transformers|SLIMSAM_MODEL/.test(browserRuntime), "browser-runtime.js must not contain the retired SlimSAM implementation");
assert(!/runSamPrediction\s*=|runYolo\s*=|installAIFromMenu\s*=|showModelStatus\s*=/.test(browserRuntime), "browser-runtime.js must stay a shared browser runtime base");
assert(browserFileGuard.includes("assertUniqueImageStem") && browserFileGuard.includes("findExistingJson"), "file guard must prevent shared-stem JSON collisions and resolve actual JSON case");
assert(mobileFolderCompat.includes("webkitdirectory") && mobileFolderCompat.includes("__helloLabelMobileCompat"), "mobile folder compatibility mode must remain available");
assert(browserSam.includes("onnx-community/sam2.1-hiera-tiny-ONNX"), "browser SAM runtime must use SAM2.1 Tiny");
assert(browserSam.includes("state.sam === samRef") && browserSam.includes("runtime.sam.interactionSeq === interactionSeq"), "SAM result application must reject stale cross-image/cross-prompt results");
assert(browserSam.includes("REQUEST_TIMEOUT_MS") && browserSam.includes("resetWorker"), "SAM worker requests must recover from dead workers/timeouts");
assert(browserYolo.includes("state.data === dataRef") && browserYolo.includes("previewBlob || imageFile"), "YOLO result application must stay bound to the originating image/data");
assert(browserYolo.includes("runtime.yolo.module === promise") && browserYolo.includes("runtime.yolo.module = null"), "YOLO module import failures must be retryable");
assert(samWorker.includes("Sam2Model") && samWorker.includes("Sam2Processor"), "SAM worker must use Transformers.js SAM2 APIs");
assert(samWorker.includes("input_boxes"), "SAM2.1 worker must preserve true box prompts");
assert(samWorker.includes("./sam-mask-utils.js"), "SAM worker must use the tested SAM2.1 mask tensor helper");
assert(!samWorker.includes("RawImage.fromTensor"), "SAM worker must not convert a 2D mask Tensor through RawImage.fromTensor");
assert(samWorker.includes("disposeTensorTree") && samWorker.includes("releaseImageState"), "SAM worker must release temporary tensors and old image embeddings");
assert(samWorker.includes("requestQueue = requestQueue.then"), "SAM worker requests must be serialized");
assert(samWorker.includes("modelPromise = null") && samWorker.includes("processorPromise = null"), "SAM model/processor load failures must be retryable");
assert(samMaskUtils.includes("extractBestMask") && samMaskUtils.includes("tensor.data"), "SAM mask helper must extract the selected 2D Tensor directly");

// Geometry and privacy invariants.
assert(orientedRectDirection.includes("points.length !== 4"), "OBB direction overlay must derive from the four Labelme points");
assert(orientedRectDirection.includes("firstMidpoint") && orientedRectDirection.includes("secondMidpoint"), "OBB direction must use first/opposite edge midpoints");
assert(!/shape\.direction\s*=|direction\s*:\s*\[/.test(orientedRectDirection), "OBB direction overlay must not add a HelloLabel-only direction field to JSON shapes");
assert(viewportContextMenu.includes('addEventListener("contextmenu"') && viewportContextMenu.includes("preventDefault"), "image viewport must suppress the browser context menu locally");
assert(privacyGuard.includes('"/api/telemetry"'), "privacy guard must explicitly allow telemetry");
assert(privacyGuard.includes('url.pathname === "/api"') && privacyGuard.includes('url.pathname.startsWith("/api/")'), "privacy guard must block other legacy /api calls");
assert(privacyGuard.includes("XMLHttpRequest") && privacyGuard.includes("sendBeacon"), "privacy guard must block non-fetch legacy API transports too");
assert(!browserRuntimeUi.includes("/api/system/install-ai"), "browser runtime UI must not call the legacy AI installer API");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-detect")'), "browser AI installer must prepare YOLO11 Detect locally");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-seg")'), "browser AI installer must prepare YOLO11 Seg locally");
assert(browserRuntimeUi.includes('runtime.sam.request("warmup")'), "browser AI installer must prepare SAM2.1 Tiny locally");

// Bootstrap graph.
for (const asset of [
  "telemetry.js",
  "annotation-telemetry.js",
  "browser-file-guard.js",
  "mobile-folder-compat.js",
  "browser-model-cache.js",
  "browser-mask-geometry.js",
  "browser-sam-runtime.js",
  "browser-yolo-runtime.js",
  "browser-privacy-guard.js",
  "browser-runtime-ui.js",
  "oriented-rect-direction.js",
  "viewport-context-menu.js",
  "tools/polygon-tool.js",
  "tools/rectangle-tool.js",
  "tools/brush-tool.js",
  "tools/obb-tool.js",
  "tools/circle-tool.js",
  "tools/line-tool.js",
  "tools/point-tool.js",
  "tools/drawing-dispatcher.js",
  "tools/pointer-tool.js",
  "drawing-preview.js",
  "i18n/zh.js",
  "i18n/en.js",
  "i18n/i18n.js",
  "core/utils.js",
  "core/labelme-model.js",
  "annotation/annotation-commit.js",
  "ai/sam-controller.js",
  "ai/yolo-controller.js",
  "ui/language-theme.js",
  "ui/layout-controller.js",
  "ui/help-menu.js",
  "view/viewport-controller.js",
  "ui/status-ui.js",
  "core/history-manager.js",
  "io/json-storage.js",
  "io/folder-controller.js",
  "render/geometry-utils.js",
  "render/webgl-renderer.js",
  "render/render-cache.js",
  "render/viewport-renderer.js",
  "render/selection-overlay.js",
  "render/hit-test.js",
]) assert(app.includes(asset), `app bootstrap must load ${asset}`);
assert(index.includes('/static/app.js'), "static/index.html must load /static/app.js");
assert(i18nCore.includes("HelloLabelI18n"), "i18n core must expose HelloLabelI18n");
assert(i18nZh.includes("HelloLabelI18nMessages.zh"), "Chinese messages must be split from app core");
assert(i18nEn.includes("HelloLabelI18nMessages.en"), "English messages must be split from app core");
assert(coreUtils.includes("HelloLabelUtils"), "core utils must expose HelloLabelUtils");
assert(labelmeModel.includes("HelloLabelModel"), "Labelme model must expose HelloLabelModel");
assert(annotationCommit.includes("HelloLabelAnnotationCommit"), "annotation commit must expose HelloLabelAnnotationCommit");
assert(samController.includes("HelloLabelSamController"), "SAM controller must be extracted");
assert(yoloController.includes("HelloLabelYoloController"), "YOLO controller must be extracted");
assert(languageTheme.includes("HelloLabelLanguageTheme"), "language/theme controller must be extracted");
assert(layoutController.includes("HelloLabelLayout"), "layout controller must be extracted");
assert(helpMenu.includes("HelloLabelHelpMenu"), "help/menu controller must be extracted");
assert(viewportController.includes("HelloLabelViewport"), "viewport controller must be extracted");
assert(statusUi.includes("HelloLabelStatusUI"), "status UI must be extracted");
assert(historyManager.includes("HelloLabelHistory"), "history manager must be extracted");
assert(jsonStorage.includes("HelloLabelJsonStorage"), "JSON storage must be extracted");
assert(folderController.includes("HelloLabelFolder"), "folder controller must be extracted");
assert(geometryUtils.includes("HelloLabelGeometry"), "geometry utils must be extracted");
assert(webglRenderer.includes("HelloLabelWebGL"), "WebGL renderer must be extracted");
assert(renderCache.includes("HelloLabelRenderCache"), "render cache must be extracted");
assert(viewportRenderer.includes("HelloLabelViewportRenderer"), "viewport renderer must be extracted");
assert(selectionOverlay.includes("HelloLabelSelectionOverlay"), "selection overlay must be extracted");
assert(hitTest.includes("HelloLabelHitTest"), "hit testing must be extracted");
assert(!appCore.includes("lineVs="), "WebGL shader implementation must not remain inline in app core");
assert(!appCore.includes("state.shapeById.clear();state.indexById.clear();state.shapeGrid.clear();"), "render cache implementation must not remain inline in app core");
assert(!appCore.includes("async function requestFolder(){"), "folder workflow must not remain inline in app core");
assert(!appCore.includes("async function saveJsonToFolder(showMessage=true){"), "JSON save implementation must not remain inline in app core");
assert(!appCore.includes("function pushHistory(){if(!state.data)"), "history implementation must not remain inline in app core");
assert(!appCore.includes("async function runYolo(){"), "YOLO implementation must not remain inline in app core");
assert(!appCore.includes("function renderSamOverlay(){\n  els.samPrompts"), "SAM rendering must not remain inline in app core");
assert(!appCore.includes("function fitToWindow(){if(!state.data)"), "viewport implementation must not remain inline in app core");
assert(!appCore.includes("const I18N={"), "translation dictionary must not remain inline in app core");
assert(!appCore.includes("function ensureHelloLabel()"), "Labelme model logic must not remain inline in app core");
assert(!appCore.includes("async function commitGeometry("), "annotation commit implementation must not remain inline in app core");
assert(drawingPreview.includes("HelloLabelDrawingPreview"), "drawing preview must expose HelloLabelDrawingPreview");
assert(drawingPreview.includes("function currentShape()"), "drawing preview must own current drawing shape construction");
assert(drawingPreview.includes("function render()"), "drawing preview must own SVG preview rendering");
assert(appCore.includes("HelloLabelDrawingPreview.configure"), "app core must configure extracted drawing preview");
assert(!appCore.includes("function currentDrawingShape()"), "currentDrawingShape must not remain inline in app core");
assert(!appCore.includes('els.drawingPath.setAttribute("d",shapeScreenPath(shape))'), "drawing preview SVG rendering must not remain inline in app core");
assert(drawingDispatcher.includes("HelloLabelDrawingDispatcher"), "drawing dispatcher must expose HelloLabelDrawingDispatcher");
assert(circleTool.includes("HelloLabelCircleTool"), "circle tool must expose HelloLabelCircleTool");
assert(lineTool.includes("HelloLabelLineTool"), "line tool must expose HelloLabelLineTool");
assert(pointTool.includes("HelloLabelPointTool"), "point tool must expose HelloLabelPointTool");
assert(appCore.includes("HelloLabelDrawingDispatcher.configure"), "app core must configure extracted drawing dispatcher");
assert(!appCore.includes('if(m==="circle")'), "circle drawing logic must not remain inline in app core");
assert(!appCore.includes('if(m==="line")'), "line drawing logic must not remain inline in app core");
assert(!appCore.includes('if(m==="point")'), "point drawing logic must not remain inline in app core");

const staticReferences = [...app.matchAll(/`\/static\/([^?`]+)\?v=/g)].map(match => `static/${match[1]}`);
for (const relative of staticReferences) assert(exists(relative), `bootstrap references missing file: ${relative}`);

const required = [
  "static/core/dom-elements.js",
  "static/core/constants.js",
  "static/core/app-state.js",
  "static/core/mode-manager.js",
  "static/core/event-manager.js",
  "static/tools/polygon-tool.js",
  "static/tools/rectangle-tool.js",
  "static/tools/brush-tool.js",
  "static/tools/obb-tool.js",
  "static/tools/circle-tool.js",
  "static/tools/line-tool.js",
  "static/tools/point-tool.js",
  "static/tools/drawing-dispatcher.js",
  "static/tools/pointer-tool.js",
  "static/drawing-preview.js",
  "static/i18n/zh.js",
  "static/i18n/en.js",
  "static/i18n/i18n.js",
  "static/core/utils.js",
  "static/core/labelme-model.js",
  "static/annotation/annotation-commit.js",
  "static/ai/sam-controller.js",
  "static/ai/yolo-controller.js",
  "static/ui/language-theme.js",
  "static/ui/layout-controller.js",
  "static/ui/help-menu.js",
  "static/view/viewport-controller.js",
  "static/ui/status-ui.js",
  "static/core/history-manager.js",
  "static/io/json-storage.js",
  "static/io/folder-controller.js",
  "static/render/geometry-utils.js",
  "static/render/webgl-renderer.js",
  "static/render/render-cache.js",
  "static/render/viewport-renderer.js",
  "static/render/selection-overlay.js",
  "static/render/hit-test.js",
  "static/app-core.js",
  "static/telemetry.js",
  "static/annotation-telemetry.js",
  "static/browser-file-guard.js",
  "static/mobile-folder-compat.js",
  "static/browser-runtime.js",
  "static/browser-model-cache.js",
  "static/browser-mask-geometry.js",
  "static/browser-sam-runtime.js",
  "static/browser-yolo-runtime.js",
  "static/browser-privacy-guard.js",
  "static/browser-runtime-ui.js",
  "static/browser-event-rebind.js",
  "static/sam-mask-utils.js",
  "static/sam-worker.js",
  "static/modal-focus-fix.js",
  "static/global-labels.js",
  "static/geometry-edit.js",
  "static/polygon-snap-visual.js",
  "static/rectangle-crosshair.js",
  "static/oriented-rect-direction.js",
  "static/viewport-context-menu.js",
  "scripts/test_boundary_guards.mjs",
  "scripts/test_mask_geometry.mjs",
  "scripts/test_sam_mask_tensor.mjs",
  "deploy/nginx.conf.example",
  "build_web.bat",
  "build_web.sh",
];
for (const relative of required) assert(exists(relative), `required v2.2 file is missing: ${relative}`);

const forbiddenLegacy = [
  "run.py", "web_api.py", "requirements.txt", "requirements-ai.txt",
  "install_ai.bat", "install_ai.sh", "config.json",
  "ai/__init__.py", "ai/geometry.py", "ai/model_manager.py",
  "desktop/prepare_runtime.py", "desktop/desktop_ai_installer.py",
  "desktop/hellolabel-server.spec", "static/version-ui.js",
];
for (const relative of forbiddenLegacy) assert(!exists(relative), `legacy server/runtime file must stay removed in v2.2: ${relative}`);

if (errors.length) {
  console.error("HelloLabel v2.2 static runtime validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`HelloLabel v2.2 static runtime validation passed (${staticReferences.length} bootstrap assets checked).`);
