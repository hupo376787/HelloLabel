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
const browserRuntime = read("static/browser-runtime.js");
const browserSam = read("static/browser-sam-runtime.js");
const browserRuntimeUi = read("static/browser-runtime-ui.js");
const samMaskUtils = read("static/sam-mask-utils.js");
const samWorker = read("static/sam-worker.js");
const privacyGuard = read("static/browser-privacy-guard.js");
const desktopMain = read("desktop/main.cjs");
const desktopPackage = JSON.parse(read("desktop/package.json"));
const workflow = read(".github/workflows/desktop-build.yml");
const startBat = read("start_web.bat");
const startSh = read("start_web.sh");

assert(desktopPackage.version === "1.5.0", "desktop/package.json must be version 1.5.0");
assert(desktopPackage.build?.extraResources?.some(item => item.from === "../static" && item.to === "static"), "desktop package must bundle ../static as resources/static");
assert(!JSON.stringify(desktopPackage.build?.extraResources || []).includes("runtime"), "desktop package must not bundle a Python runtime");
assert(!/child_process|spawn\s*\(|execFile\s*\(|exec\s*\(|web_api\.py|run\.py|fastapi|uvicorn/i.test(desktopMain), "desktop/main.cjs must not launch Python/FastAPI");
assert(/Cross-Origin-Opener-Policy/.test(desktopMain) && /Cross-Origin-Embedder-Policy/.test(desktopMain), "desktop static server must expose browser-AI isolation headers");
assert(!/prepare_runtime|setup-python|pip install|\buv\b/i.test(workflow), "desktop CI must not prepare Python runtime");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startBat), "start_web.bat must be static-server only");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startSh), "start_web.sh must be static-server only");

assert(browserRuntime.includes('mode: "browser-only"'), "browser-runtime.js must declare browser-only mode");
assert(!/SlimSAM|slimsam|@xenova\/transformers|SLIMSAM_MODEL/.test(browserRuntime), "browser-runtime.js must not contain the retired SlimSAM implementation");
assert(!/runSamPrediction\s*=|runYolo\s*=|installAIFromMenu\s*=|showModelStatus\s*=/.test(browserRuntime), "browser-runtime.js must stay a shared browser runtime base, not duplicate AI implementations");
assert(browserSam.includes("onnx-community/sam2.1-hiera-tiny-ONNX"), "browser SAM runtime must use SAM2.1 Tiny");
assert(samWorker.includes("Sam2Model") && samWorker.includes("Sam2Processor"), "SAM worker must use Transformers.js SAM2 APIs");
assert(samWorker.includes("onnx-community/sam2.1-hiera-tiny-ONNX"), "SAM worker must use the SAM2.1 Tiny browser model");
assert(samWorker.includes("input_boxes"), "SAM2.1 worker must preserve true box prompts");
assert(samWorker.includes("./sam-mask-utils.js"), "SAM worker must use the tested SAM2.1 mask tensor helper");
assert(!samWorker.includes("RawImage.fromTensor"), "SAM worker must not convert a 2D mask Tensor through RawImage.fromTensor");
assert(samMaskUtils.includes("extractBestMask") && samMaskUtils.includes("tensor.data"), "SAM mask helper must extract the selected 2D Tensor directly");

assert(privacyGuard.includes('url.pathname === "/api"') && privacyGuard.includes('url.pathname.startsWith("/api/")'), "privacy guard must block legacy /api calls");
assert(privacyGuard.includes("XMLHttpRequest") && privacyGuard.includes("sendBeacon"), "privacy guard must block non-fetch legacy API transports too");
assert(!browserRuntimeUi.includes("previousInstall"), "browser runtime UI must not chain to the legacy AI installer");
assert(!browserRuntimeUi.includes("/api/system/install-ai"), "browser runtime UI must not call the legacy AI installer API");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-detect")'), "browser AI installer must prepare YOLO11 Detect locally");
assert(browserRuntimeUi.includes('runtime.yolo.loadModel("yolo11-seg")'), "browser AI installer must prepare YOLO11 Seg locally");
assert(browserRuntimeUi.includes('runtime.sam.request("warmup")'), "browser AI installer must prepare SAM2.1 Tiny locally");

assert(app.includes("browser-model-cache.js"), "app bootstrap must load browser model cache");
assert(app.includes("browser-mask-geometry.js"), "app bootstrap must load robust mask geometry");
assert(app.includes("browser-sam-runtime.js"), "app bootstrap must load local SAM runtime");
assert(app.includes("browser-yolo-runtime.js"), "app bootstrap must load local YOLO runtime");
assert(app.includes("browser-privacy-guard.js"), "app bootstrap must load upload privacy guard");
assert(app.includes("browser-runtime-ui.js"), "app bootstrap must load browser runtime UI hardening");
assert(index.includes('/static/app.js'), "static/index.html must load /static/app.js");

const staticReferences = [...app.matchAll(/`\/static\/([^?`]+)\?v=/g)].map(match => `static/${match[1]}`);
for (const relative of staticReferences) {
  assert(exists(relative), `bootstrap references missing file: ${relative}`);
}

const required = [
  "static/app-core.js",
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
  "scripts/test_mask_geometry.mjs",
  "scripts/test_sam_mask_tensor.mjs",
  "deploy/nginx.conf.example",
  "build_web.bat",
  "build_web.sh"
];
for (const relative of required) assert(exists(relative), `required v1.5 file is missing: ${relative}`);

// v1.5 is intentionally browser-only. Keeping these obsolete server/runtime files
// in the working tree makes it too easy to accidentally reintroduce image upload,
// Python AI, or a bundled backend during future changes.
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
  assert(!exists(relative), `legacy server/runtime file must stay removed in v1.5: ${relative}`);
}

if (errors.length) {
  console.error("HelloLabel v1.5 static runtime validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`HelloLabel v1.5 static runtime validation passed (${staticReferences.length} bootstrap assets checked).`);
