import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), "utf8");
const exists = relative => fs.existsSync(path.join(root, relative));
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };

const app = read("static/app.js");
const index = read("static/index.html");
const aboutUi = read("static/about-ui.js");
const browserRuntime = read("static/browser-runtime.js");
const browserFileGuard = read("static/browser-file-guard.js");
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

assert(desktopPackage.version === "2.1.0", "desktop/package.json must be version 2.1.0");
assert(app.includes('const VERSION = "hellolabel-v210"'), "app bootstrap cache version must be hellolabel-v210");
assert(app.includes('version: "2.1.0"'), "app ready event must report version 2.1.0");
assert(browserRuntime.includes('const RUNTIME_VERSION = "2.1.0"'), "browser runtime must report version 2.1.0");
assert(aboutUi.includes('const APP_VERSION = "2.1.0"'), "About dialog must report version 2.1.0");
assert(desktopPackage.build?.extraResources?.some(item => item.from === "../static" && item.to === "static"), "desktop package must bundle ../static as resources/static");
assert(!JSON.stringify(desktopPackage.build?.extraResources || []).includes("runtime"), "desktop package must not bundle a Python runtime");
assert(!/child_process|spawn\s*\(|execFile\s*\(|exec\s*\(|web_api\.py|run\.py|fastapi|uvicorn/i.test(desktopMain), "desktop/main.cjs must not launch Python/FastAPI");
assert(/Cross-Origin-Opener-Policy/.test(desktopMain) && /Cross-Origin-Embedder-Policy/.test(desktopMain), "desktop static server must expose browser-AI isolation headers");
assert(desktopMain.includes("flushRendererSaveBeforeQuit") && desktopMain.includes("flushPendingSave"), "desktop quit flow must flush pending renderer saves before exit");
assert(!/prepare_runtime|setup-python|pip install|\buv\b/i.test(workflow), "desktop CI must not prepare Python runtime");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startBat), "start_web.bat must be static-server only");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startSh), "start_web.sh must be static-server only");

assert(browserRuntime.includes('mode: "browser-only"'), "browser-runtime.js must declare browser-only mode");
assert(browserRuntime.includes("interactionSeq"), "browser runtime must keep a non-resetting SAM interaction generation");
assert(!/SlimSAM|slimsam|@xenova\/transformers|SLIMSAM_MODEL/.test(browserRuntime), "browser-runtime.js must not contain the retired SlimSAM implementation");
assert(!/runSamPrediction\s*=|runYolo\s*=|installAIFromMenu\s*=|showModelStatus\s*=/.test(browserRuntime), "browser-runtime.js must stay a shared browser runtime base, not duplicate AI implementations");
assert(browserFileGuard.includes("assertUniqueImageStem") && browserFileGuard.includes("findExistingJson"), "file guard must prevent shared-stem JSON collisions and resolve actual JSON case");
assert(browserSam.includes("onnx-community/sam2.1-hiera-tiny-ONNX"), "browser SAM runtime must use SAM2.1 Tiny");
assert(browserSam.includes("state.sam === samRef") && browserSam.includes("runtime.sam.interactionSeq === interactionSeq"), "SAM result application must reject stale cross-image/cross-prompt results");
assert(browserSam.includes("REQUEST_TIMEOUT_MS") && browserSam.includes("resetWorker"), "SAM worker requests must recover from dead workers/timeouts");
assert(browserYolo.includes("state.data === dataRef") && browserYolo.includes("previewBlob || imageFile"), "YOLO result application must stay bound to the originating image/data");
assert(browserYolo.includes("runtime.yolo.module === promise") && browserYolo.includes("runtime.yolo.module = null"), "YOLO module import failures must be retryable");
assert(samWorker.includes("Sam2Model") && samWorker.includes("Sam2Processor"), "SAM worker must use Transformers.js SAM2 APIs");
assert(samWorker.includes("onnx-community/sam2.1-hiera-tiny-ONNX"), "SAM worker must use the SAM2.1 Tiny browser model");
assert(samWorker.includes("input_boxes"), "SAM2.1 worker must preserve true box prompts");
assert(samWorker.includes("./sam-mask-utils.js"), "SAM worker must use the tested SAM2.1 mask tensor helper");
assert(!samWorker.includes("RawImage.fromTensor"), "SAM worker must not convert a 2D mask Tensor through RawImage.fromTensor");
assert(samWorker.includes("disposeTensorTree") && samWorker.includes("releaseImageState"), "SAM worker must release temporary tensors and old image embeddings");
assert(samWorker.includes("requestQueue = requestQueue.then"), "SAM worker requests must be serialized to avoid embedding/reset races");
assert(samWorker.includes("modelPromise = null") && samWorker.includes("processorPromise = null"), "SAM model/processor load failures must be retryable");
assert(samMaskUtils.includes("extractBestMask") && samMaskUtils.includes("tensor.data"), "SAM mask helper must extract the selected 2D Tensor directly");

assert(orientedRectDirection.includes("points.length !== 4"), "OBB direction overlay must derive from the four Labelme points");
assert(orientedRectDirection.includes("firstMidpoint") && orientedRectDirection.includes("secondMidpoint"), "OBB direction must be derived from the first and opposite edge midpoints");
assert(orientedRectDirection.includes("secondMidpoint[0] - firstMidpoint[0]") && orientedRectDirection.includes("secondMidpoint[1] - firstMidpoint[1]"), "OBB direction must point perpendicularly from the first edge toward the opposite edge");
assert(!/shape\.direction\s*=|direction\s*:\s*\[/.test(orientedRectDirection), "OBB direction overlay must not add a HelloLabel-only direction field to JSON shapes");
assert(viewportContextMenu.includes('addEventListener("contextmenu"') && viewportContextMenu.includes("preventDefault"), "image viewport must suppress the browser context menu locally");

assert(privacyGuard.includes('url.pathname === "/api"') && privacyGuard.includes('url.pathname.startsWith("/api/")'), "privacy guard must block legacy /api calls");
assert(privacyGuard.includes("XMLHttpRequest") && privacyGuard.includes("sendBeacon"), "privacy guard must block non-fetch legacy API transports too");
assert(!browserRuntimeUi.includes("previousInstall"), "browser runtime UI must not chain to the legacy AI installer");
assert(!browserRuntimeUi.includes("/api/system/install-ai"), "browser runtime UI must not call the legacy AI installer API");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-detect")'), "browser AI installer must prepare YOLO11 Detect locally");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-seg")'), "browser AI installer must prepare YOLO11 Seg locally");
assert(browserRuntimeUi.includes('runtime.sam.request("warmup")'), "browser AI installer must prepare SAM2.1 Tiny locally");

assert(app.includes("browser-file-guard.js"), "app bootstrap must load file collision/case guard");
assert(app.includes("browser-model-cache.js"), "app bootstrap must load browser model cache");
assert(app.includes("browser-mask-geometry.js"), "app bootstrap must load robust mask geometry");
assert(app.includes("browser-sam-runtime.js"), "app bootstrap must load local SAM runtime");
assert(app.includes("browser-yolo-runtime.js"), "app bootstrap must load local YOLO runtime");
assert(app.includes("browser-privacy-guard.js"), "app bootstrap must load upload privacy guard");
assert(app.includes("browser-runtime-ui.js"), "app bootstrap must load browser runtime UI hardening");
assert(app.includes("oriented-rect-direction.js"), "app bootstrap must load the oriented rectangle direction overlay");
assert(app.includes("viewport-context-menu.js"), "app bootstrap must load the viewport context-menu guard");
assert(index.includes('/static/app.js'), "static/index.html must load /static/app.js");

const staticReferences = [...app.matchAll(/`\/static\/([^?`]+)\?v=/g)].map(match => `static/${match[1]}`);
for (const relative of staticReferences) {
  assert(exists(relative), `bootstrap references missing file: ${relative}`);
}

const required = [
  "static/app-core.js",
  "static/browser-file-guard.js",
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
  "scripts/e2e_browser_v210.mjs",
  "deploy/nginx.conf.example",
  "build_web.bat",
  "build_web.sh"
];
for (const relative of required) assert(exists(relative), `required v2.1 file is missing: ${relative}`);

const forbiddenLegacy = [
  "run.py",
  "web_api.py",
  "requirements.txt",
  "requirements-ai.txt",
  "install_ai.bat",
  "install_ai.sh",
  "config.json",
  "ai/__init__.py",
  "ai/geometry.py",
  "ai/model_manager.py",
  "desktop/prepare_runtime.py",
  "desktop/desktop_ai_installer.py",
  "desktop/hellolabel-server.spec",
  "static/version-ui.js"
];
for (const relative of forbiddenLegacy) {
  assert(!exists(relative), `legacy server/runtime file must stay removed in v2.1: ${relative}`);
}

if (errors.length) {
  console.error("HelloLabel v2.1 static runtime validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`HelloLabel v2.1 static runtime validation passed (${staticReferences.length} bootstrap assets checked).`);
