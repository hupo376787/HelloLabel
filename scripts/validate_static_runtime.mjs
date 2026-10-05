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
const i18nMenuZh = read("static/i18n/menu-zh.js");
const i18nEn = read("static/i18n/en.js");
const i18nMenuEn = read("static/i18n/menu-en.js");
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
const modalController = read("static/ui/modal-controller.js");
const labelsController = read("static/ui/labels-controller.js");
const instanceList = read("static/ui/instance-list.js");
const selectionController = read("static/ui/selection-controller.js");
const renderOrchestrator = read("static/ui/render-orchestrator.js");
const editCommands = read("static/annotation/edit-commands.js");
const uiEvents = read("static/events/ui-events.js");
const viewportEvents = read("static/events/viewport-events.js");
const keyboardEvents = read("static/events/keyboard-events.js");
const appInitializer = read("static/core/app-initializer.js");
const drawingPreview = read("static/drawing-preview.js");
const drawingDispatcher = read("static/tools/drawing-dispatcher.js");
const circleTool = read("static/tools/circle-tool.js");
const lineTool = read("static/tools/line-tool.js");
const pointTool = read("static/tools/point-tool.js");
const pointerInput = read("static/pointer-input.js");
const mobileTouchUi = read("static/mobile-touch-ui.js");
const mobileToolbarState = read("static/mobile-toolbar-state.js");
const layoutFixes = read("static/layout-fixes.js");
const index = read("static/index.html");
const aboutUi = read("static/about-ui.js");
const telemetry = read("static/telemetry.js");
const annotationTelemetry = read("static/annotation-telemetry.js");
const browserRuntime = read("static/browser-runtime.js");
const browserFileGuard = read("static/browser-file-guard.js");
const mobileFolderCompat = read("static/mobile-folder-compat.js");
const globalLabels = read("static/global-labels.js");
const browserSam = read("static/browser-sam-runtime.js");
const browserYolo = read("static/browser-yolo-runtime.js");
const browserRuntimeUi = read("static/browser-runtime-ui.js");
const browserEventRebind = read("static/browser-event-rebind.js");
const modalFocusFix = read("static/modal-focus-fix.js");
const geometryEdit = read("static/geometry-edit.js");
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
assert(desktopPackage.version === "3.0.0", "desktop/package.json must be version 3.0.0");
assert(app.includes('const VERSION = "hellolabel-v300'), "app bootstrap cache version must use hellolabel-v300");
assert(app.includes("const pendingScripts = scripts.map(queueScript)") && app.includes("await Promise.all(pendingScripts)"), "bootstrap modules must be fetched in parallel");
assert(!app.includes("for (const src of scripts) await loadScript(src)"), "bootstrap must not serialize every module request");
assert(app.includes('version: "3.0.0"'), "app ready event must report version 3.0.0");
assert(app.includes("pointer-input.js"), "app bootstrap must load the pointer input layer");
assert(pointerInput.includes("mouse: Object.freeze") && pointerInput.includes("touch: Object.freeze") && pointerInput.includes("pen: Object.freeze"), "pointer-input.js must define mouse/touch/pen profiles");
assert(pointerInput.includes("activePointers = new Map"), "pointer-input.js must track active pointers");
assert(pointerInput.includes("beginTwoFingerPan") && pointerInput.includes("pointerDistance"), "pointer-input.js must support two-finger pan/pinch");
assert(pointerInput.includes("hellolabel-touch-actions") && pointerInput.includes("sam-negative"), "pointer-input.js must provide touch completion/context alternatives");
assert(mobileTouchUi.includes("hellolabel-touch-layout"), "touch UI must support the unified small-screen touch layout");
assert(mobileTouchUi.includes("data-touch-menu"), "touch layout must expose a main menu entry");
assert(mobileTouchUi.includes("hellolabel-touch-app-menu") && mobileTouchUi.includes("HelloLabelLayout?.toggleAppMenu?.()"), "touch menu must reuse the existing app menu and command routing");
assert(mobileTouchUi.includes("appMenuAnchor"), "touch menu must restore the original menu DOM when leaving touch layout");
assert(!mobileTouchUi.includes('dispatchEvent(new Event("resize"))'), "touch UI must not synthesize resize events and create a feedback loop");
assert(!mobileTouchUi.includes('addEventListener("resize", syncLayout'), "touch UI must rely on the responsive-layout event instead of a duplicate resize listener");
assert(mobileTouchUi.includes("hellolabel:touch-panel-resized"), "touch drawer may emit a scoped panel-resized event without retriggering responsive layout");
assert(mobileTouchUi.includes("leftSidebar") && mobileTouchUi.includes("rightSidebar") && mobileTouchUi.includes('querySelector(".ai-row")'), "touch UI must reuse the live image, annotation, and AI panels");
assert(!mobileTouchUi.includes("mobile-touch-action-bar"), "touch UI must not create a second annotation action bar");
assert(mobileToolbarState.includes("helloLabelPointerInput?.refreshTouchActions?.()"), "mobile toolbar state must delegate to the pointer-input action bar");
assert(layoutFixes.includes('root.classList.toggle("hellolabel-touch-layout", touchLayout)'), "responsive layout must expose a touch-layout class");
assert(layoutFixes.includes("width <= 1280 || height <= 800"), "small touch tablets must use the touch layout by viewport size");
assert(layoutFixes.includes('root.classList.toggle("hellolabel-compact", !touchLayout'), "compact desktop layout must not override touch-tablet layout");
assert(browserRuntime.includes('const RUNTIME_VERSION = "3.0.0"'), "browser runtime must report version 3.0.0");
assert(aboutUi.includes('const APP_VERSION = "3.0.0"'), "About dialog must report version 3.0.0");
assert(aboutUi.includes("HelloLabelAboutUI") && aboutUi.includes("about-modal-card"), "v3.0 About dialog must expose the rich About UI module");
assert(helpMenu.includes("HelloLabelAboutUI?.showAbout"), "About menu command must route to the v2.2 rich About dialog");
assert(helpMenu.includes("HelloLabelAboutUI?.showShortcuts"), "Shortcuts menu command must route to the v3.0 rich shortcuts dialog");
assert(aboutUi.includes("shortcuts-modal-card") && aboutUi.includes("showShortcutsDialog"), "v3.0 rich shortcuts dialog must remain available");
assert(!/^\s{2}(?:showAbout|showShortcuts)\s*=/m.test(aboutUi), "About UI must not monkey-patch global functions");
assert(!helpMenu.includes("Version 0.2.14"), "legacy simplified About version must not return");
assert(telemetry.includes('let appVersion = "3.0.0"'), "telemetry fallback version must report 3.0.0");
assert(annotationTelemetry.includes("HelloLabelAnnotationCommit") && annotationTelemetry.includes("commitApi.commitGeometry = wrapped"), "annotation telemetry must wrap the modular commit API");
assert(!annotationTelemetry.includes("window.commitGeometry = wrapped"), "annotation telemetry must not patch the retired global commit function");

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
assert(samWorker.includes('new URL(self.location.href).searchParams.get("v")') && samWorker.includes("maskUtilsPromise"), "SAM worker dependency must inherit the current worker cache token");
assert(!samWorker.includes("hellolabel-v150"), "SAM worker must not retain a v1.5 cache token");
assert(!samWorker.includes("RawImage.fromTensor"), "SAM worker must not convert a 2D mask Tensor through RawImage.fromTensor");
assert(samWorker.includes("disposeTensorTree") && samWorker.includes("releaseImageState"), "SAM worker must release temporary tensors and old image embeddings");
assert(samWorker.includes("requestQueue = requestQueue.then"), "SAM worker requests must be serialized");
assert(samWorker.includes("modelPromise = null") && samWorker.includes("processorPromise = null"), "SAM model/processor load failures must be retryable");
assert(samMaskUtils.includes("extractBestMask") && samMaskUtils.includes("tensor.data"), "SAM mask helper must extract the selected 2D Tensor directly");

// Geometry and privacy invariants.
assert(orientedRectDirection.includes("points.length !== 4"), "OBB direction overlay must derive from the four Labelme points");
assert(orientedRectDirection.includes("firstMidpoint") && orientedRectDirection.includes("secondMidpoint"), "OBB direction must use first/opposite edge midpoints");
assert(!/shape\.direction\s*=|direction\s*:\s*\[/.test(orientedRectDirection), "OBB direction overlay must not add a HelloLabel-only direction field to JSON shapes");
assert(orientedRectDirection.includes("HelloLabelDrawingPreview?.currentShape?.()"), "OBB direction preview must use the extracted drawing-preview module");
assert(!orientedRectDirection.includes("originalApplyTransformNow") && !orientedRectDirection.includes("applyTransformNow = function"), "OBB direction overlay must not monkey-patch the retired global viewport renderer");
assert(viewportRenderer.includes("helloLabelOrientedRectDirection?.render?.()"), "viewport renderer must schedule the OBB direction overlay");
assert(drawingPreview.includes("helloLabelOrientedRectDirection?.render?.()"), "drawing preview must keep the OBB direction arrow live while drawing");
assert(viewportContextMenu.includes('addEventListener("contextmenu"') && viewportContextMenu.includes("preventDefault"), "image viewport must suppress the browser context menu locally");
assert(privacyGuard.includes('"/api/telemetry"'), "privacy guard must explicitly allow telemetry");
assert(privacyGuard.includes('url.pathname === "/api"') && privacyGuard.includes('url.pathname.startsWith("/api/")'), "privacy guard must block other legacy /api calls");
assert(privacyGuard.includes("XMLHttpRequest") && privacyGuard.includes("sendBeacon"), "privacy guard must block non-fetch legacy API transports too");
assert(!browserRuntimeUi.includes("/api/system/install-ai"), "browser runtime UI must not call the legacy AI installer API");
assert(browserRuntimeUi.includes("HelloLabelBrowserRuntimeUI"), "browser runtime UI must expose a stable browser-only menu/status API");
assert(!/v1\.5|1\.5\.0/.test(browserRuntimeUi + browserYolo + browserSam), "browser AI UI/runtime must not retain stale v1.5 identity");
assert(browserYolo.includes("HelloLabelBrowserYoloRuntime") && !browserYolo.includes("runYolo = async function"), "browser YOLO must expose a module API instead of replacing globals");
assert(browserSam.includes("HelloLabelBrowserSamRuntime") && !browserSam.includes("runSamPrediction = async function"), "browser SAM must expose a module API instead of replacing globals");
assert(!browserSam.includes("hellolabel-v150") && !browserSam.includes("sam15-"), "SAM runtime must use current 2.2 asset/request identity");
assert(!browserEventRebind.includes('addEventListener("click"'), "browser AI compatibility shim must not install duplicate click handlers");
assert(!yoloController.includes("/api/") && yoloController.includes("HelloLabelBrowserYoloRuntime"), "YOLO controller must use browser runtime only");
assert(!samController.includes("/api/") && samController.includes("HelloLabelBrowserSamRuntime"), "SAM controller must use browser runtime only");
assert(!folderController.includes("/api/preview"), "folder controller must not retain the legacy preview API");
assert(folderController.includes("api.siblingJsonHandle(entry.name, false)"), "image open must honor the guarded JSON resolver");
assert(app.includes("HELLOLABEL_ASSET_VERSION"), "bootstrap must expose the build token to nested worker assets");
assert(helpMenu.includes("HelloLabelBrowserRuntimeUI") && !helpMenu.includes("/api/system/install-ai"), "help menu must delegate AI setup to the browser runtime and never call the legacy installer API");
assert(appCore.includes("HelloLabelBrowserRuntimeUI?.showModelStatus"), "model status callbacks must dynamically use the browser runtime UI");
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
  "i18n/menu-zh.js",
  "i18n/en.js",
  "i18n/menu-en.js",
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
  "ui/modal-controller.js",
  "ui/labels-controller.js",
  "ui/instance-list.js",
  "ui/selection-controller.js",
  "ui/render-orchestrator.js",
  "annotation/edit-commands.js",
  "events/ui-events.js",
  "events/viewport-events.js",
  "events/keyboard-events.js",
  "core/app-initializer.js",
]) assert(app.includes(asset), `app bootstrap must load ${asset}`);
assert(index.includes('/static/app.js'), "static/index.html must load /static/app.js");
const cacheToken = app.match(/const VERSION = "(hellolabel-v[0-9A-Za-z-]+)"/)?.[1];
assert(!!cacheToken, "app bootstrap cache token must be detectable");
assert(index.includes(cacheToken), "static/index.html must use the same cache token as static/app.js");
assert(read("build_web.bat").includes(cacheToken), "build_web.bat must use the same cache token as static/app.js");
assert(read("build_web.sh").includes(cacheToken), "build_web.sh must use the same cache token as static/app.js");
assert(app.includes("bootstrap/core-services.js"), "app bootstrap must load bootstrap/core-services.js");
assert(app.includes("bootstrap/render-services.js"), "app bootstrap must load bootstrap/render-services.js");
assert(app.includes("bootstrap/ui-services.js"), "app bootstrap must load bootstrap/ui-services.js");
assert(app.includes("bootstrap/drawing-services.js"), "app bootstrap must load bootstrap/drawing-services.js");
assert(app.includes("bootstrap/ai-services.js"), "app bootstrap must load bootstrap/ai-services.js");
assert(app.includes("bootstrap/view-services.js"), "app bootstrap must load bootstrap/view-services.js");
assert(app.includes("bootstrap/event-services.js"), "app bootstrap must load bootstrap/event-services.js");
assert(app.includes("bootstrap/app-start.js"), "app bootstrap must load bootstrap/app-start.js");
assert(i18nCore.includes("HelloLabelI18n"), "i18n core must expose HelloLabelI18n");
assert(i18nZh.includes("HelloLabelI18nMessages.zh"), "Chinese messages must be split from app core");
assert(i18nMenuZh.includes("HelloLabelI18nMessages.zh"), "Chinese menu messages must be split from app core");
assert(i18nEn.includes("HelloLabelI18nMessages.en"), "English messages must be split from app core");
assert(i18nMenuEn.includes("HelloLabelI18nMessages.en"), "English menu messages must be split from app core");
assert(!appCore.includes("I18N."), "legacy I18N references must not remain in app core");
assert(coreUtils.includes("HelloLabelUtils"), "core utils must expose HelloLabelUtils");
assert(labelmeModel.includes("HelloLabelModel"), "Labelme model must expose HelloLabelModel");
assert(labelmeModel.includes("setLabelColorResolver"), "Labelme model must expose a safe label-color extension point");
assert(globalLabels.includes("HelloLabelModel.setLabelColorResolver") && globalLabels.includes("HelloLabelLabels.renderLabelList"), "global label library must extend module APIs");
assert(!/^\s{2}(?:ensureHelloLabel|labelColor|refreshFolderEntries|resetCurrentState|renderLabelList|changeLabelColor|chooseLabelModal|resolveNewShapeLabel|addLabel|renameLabel|deleteLabel|applyLanguage)\s*=/m.test(globalLabels), "global label library must not reassign core global bindings");
assert(!/^\s{2}(?:showModal|closeModal|chooseLabelModal)\s*=/m.test(modalFocusFix), "modal focus compatibility must extend HelloLabelModal instead of globals");
assert(modalFocusFix.includes("HelloLabelModal.showModal") && modalFocusFix.includes("HelloLabelModal.closeModal"), "modal focus compatibility must use modal module APIs");
assert(!/^\s{2}(?:cancelDrawing|commitGeometry)\s*=/m.test(geometryEdit), "geometry editing must extend HelloLabelAnnotationCommit instead of globals");
assert(geometryEdit.includes("HelloLabelAnnotationCommit.commitGeometry") && annotationCommit.includes("api.commitGeometry(type, points)"), "geometry reopen flow must be honored by sequence completion");
assert(browserFileGuard.includes("HelloLabelFolder.siblingJsonHandle") && browserFileGuard.includes("HelloLabelJsonStorage.deleteCurrentJson"), "file guard must extend storage/folder module APIs");
assert(!browserFileGuard.includes('addEventListener("click"'), "file guard must not install duplicate delete listeners");
assert(mobileFolderCompat.includes("HelloLabelFolder.requestFolder") && mobileFolderCompat.includes("HelloLabelJsonStorage.saveJsonToFolder"), "mobile compatibility must extend module APIs");
assert(!mobileFolderCompat.includes('addEventListener("click", compatible'), "mobile compatibility must not install duplicate toolbar listeners");
assert(jsonStorage.includes("siblingJsonHandle(imageName, true)"), "JSON save must use the guarded same-stem resolver");
assert(folderController.includes("api.refreshFolderEntries()") && folderController.includes("api.resetCurrentState()"), "folder controller internal flows must honor module extensions");
assert(labelmeModel.includes("exactPointCounts") && labelmeModel.includes("oriented_rectangle:4"), "Labelme validation must enforce shape point-count semantics");
assert(labelmeModel.includes("Number.isFinite(value)") && labelmeModel.includes("Number.isInteger(shape.group_id)"), "Labelme validation must enforce finite coordinates and integer group_id");
assert(labelmeModel.includes('typeof flag !== "boolean"'), "Labelme validation must enforce boolean flag values");
assert(labelmeModel.includes('data.imageData !== null && typeof data.imageData !== "string"'), "Labelme validation must require Labelme-compatible imageData");
assert(labelmeModel.includes("imageHeight mismatch") && labelmeModel.includes("imageWidth mismatch"), "Labelme validation must reject image dimension mismatches");
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
assert(jsonStorage.includes("validateLabelme(state.data);"), "JSON save must validate the final Labelme payload before writing");
assert(mobileFolderCompat.includes("validateLabelme(state.data);"), "mobile JSON save must validate the final Labelme payload before download");
assert(folderController.includes("HelloLabelFolder"), "folder controller must be extracted");
assert(geometryUtils.includes("HelloLabelGeometry"), "geometry utils must be extracted");
assert(webglRenderer.includes("HelloLabelWebGL"), "WebGL renderer must be extracted");
assert(renderCache.includes("HelloLabelRenderCache"), "render cache must be extracted");
assert(viewportRenderer.includes("HelloLabelViewportRenderer"), "viewport renderer must be extracted");
assert(selectionOverlay.includes("HelloLabelSelectionOverlay"), "selection overlay must be extracted");
assert(hitTest.includes("HelloLabelHitTest"), "hit testing must be extracted");
assert(modalController.includes("HelloLabelModal"), "modal controller must be extracted");
assert(labelsController.includes("HelloLabelLabels"), "labels controller must be extracted");
assert(instanceList.includes("HelloLabelInstances"), "instance list must be extracted");
assert(selectionController.includes("HelloLabelSelection"), "selection controller must be extracted");
assert(renderOrchestrator.includes("HelloLabelRenderAll"), "render orchestration must be extracted");
assert(editCommands.includes("HelloLabelEditCommands"), "annotation edit commands must be extracted");
assert(uiEvents.includes("HelloLabelUiEvents"), "UI events must be extracted");
assert(viewportEvents.includes("HelloLabelViewportEvents"), "viewport events must be extracted");
assert(viewportEvents.includes('closest?.(".hellolabel-touch-actions")'), "viewport drawing events must ignore touch action bar controls");
assert(viewportEvents.includes("if(isTouchActionEvent(event))return;"), "touch action bar pointer events must not create annotation points");
assert(keyboardEvents.includes("HelloLabelKeyboardEvents"), "keyboard events must be extracted");
assert(appInitializer.includes("HelloLabelAppInitializer"), "app initializer must be extracted");
assert(!appCore.includes('els.openFolderBtn.addEventListener("click",requestFolder);'), "UI event binding must not remain inline in app core");
assert(!appCore.includes('window.addEventListener("keydown",ev=>'), "keyboard binding must not remain inline in app core");
assert(!appCore.includes("function showModal({title,body,buttons})"), "modal implementation must not remain inline in app core");
assert(!appCore.includes("function renderLabelList(){\n  if(!state.data)"), "label rendering must not remain inline in app core");
assert(!appCore.includes("function rebuildInstanceList(){state.instanceIds"), "instance list implementation must not remain inline in app core");
assert(!appCore.includes("lineVs="), "WebGL shader implementation must not remain inline in app core");
assert(!appCore.includes("state.shapeById.clear();state.indexById.clear();state.shapeGrid.clear();"), "render cache implementation must not remain inline in app core");
assert(!appCore.includes("async function requestFolder(){"), "folder workflow must not remain inline in app core");
assert(folderController.includes("await api.loadPreview(state.imageFile);"), "folder controller must dispatch preview loading through the replaceable module API");
assert(browserRuntime.includes("window.HelloLabelFolder.loadPreview = async function(file)"), "browser runtime must replace the folder module preview loader directly");
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
  "static/bootstrap/core-services.js",
  "static/bootstrap/render-services.js",
  "static/bootstrap/ui-services.js",
  "static/bootstrap/drawing-services.js",
  "static/bootstrap/ai-services.js",
  "static/bootstrap/view-services.js",
  "static/bootstrap/event-services.js",
  "static/bootstrap/app-start.js",
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
  "static/i18n/menu-zh.js",
  "static/i18n/en.js",
  "static/i18n/menu-en.js",
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
  "static/ui/modal-controller.js",
  "static/ui/labels-controller.js",
  "static/ui/instance-list.js",
  "static/ui/selection-controller.js",
  "static/ui/render-orchestrator.js",
  "static/annotation/edit-commands.js",
  "static/events/ui-events.js",
  "static/events/viewport-events.js",
  "static/events/keyboard-events.js",
  "static/core/app-initializer.js",
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
for (const relative of required) assert(exists(relative), `required v3.0 file is missing: ${relative}`);

const byteSize = relative => Buffer.byteLength(read(relative), "utf8");

const bootstrapRuntimeFiles = [
  "static/bootstrap/core-services.js",
  "static/bootstrap/render-services.js",
  "static/bootstrap/ui-services.js",
  "static/bootstrap/drawing-services.js",
  "static/bootstrap/ai-services.js",
  "static/bootstrap/view-services.js",
  "static/bootstrap/event-services.js",
  "static/bootstrap/app-start.js",
];
for (const relative of bootstrapRuntimeFiles) {
  assert(byteSize(relative) <= 8 * 1024, `${relative} must stay <= 8 KiB`);
}
assert(!appCore.includes(".configure({"), "app-core.js must remain a thin facade without configure blocks");
assert(!appCore.includes(".bind();"), "app-core.js must not bind runtime events directly");

// Keep the composition root small, and prevent extracted feature modules from growing back into monoliths.
assert(byteSize("static/app-core.js") <= 12 * 1024, "static/app-core.js must stay <= 12 KiB");

const modularRuntimeFiles = [
  "static/bootstrap/core-services.js",
  "static/bootstrap/render-services.js",
  "static/bootstrap/ui-services.js",
  "static/bootstrap/drawing-services.js",
  "static/bootstrap/ai-services.js",
  "static/bootstrap/view-services.js",
  "static/bootstrap/event-services.js",
  "static/bootstrap/app-start.js",
  "static/core/dom-elements.js",
  "static/core/constants.js",
  "static/core/app-state.js",
  "static/core/mode-manager.js",
  "static/core/event-manager.js",
  "static/core/utils.js",
  "static/core/labelme-model.js",
  "static/core/history-manager.js",
  "static/core/app-initializer.js",
  "static/annotation/annotation-commit.js",
  "static/annotation/edit-commands.js",
  "static/render/geometry-utils.js",
  "static/render/webgl-renderer.js",
  "static/render/render-cache.js",
  "static/render/viewport-renderer.js",
  "static/render/selection-overlay.js",
  "static/render/hit-test.js",
  "static/ui/status-ui.js",
  "static/ui/language-theme.js",
  "static/ui/layout-controller.js",
  "static/ui/help-menu.js",
  "static/ui/modal-controller.js",
  "static/ui/labels-controller.js",
  "static/ui/instance-list.js",
  "static/ui/selection-controller.js",
  "static/ui/render-orchestrator.js",
  "static/io/folder-controller.js",
  "static/io/json-storage.js",
  "static/ai/sam-controller.js",
  "static/ai/yolo-controller.js",
  "static/events/ui-events.js",
  "static/events/viewport-events.js",
  "static/events/keyboard-events.js",
  "static/tools/polygon-tool.js",
  "static/tools/rectangle-tool.js",
  "static/tools/brush-tool.js",
  "static/tools/obb-tool.js",
  "static/tools/circle-tool.js",
  "static/tools/line-tool.js",
  "static/tools/point-tool.js",
  "static/tools/pointer-tool.js",
  "static/tools/drawing-dispatcher.js",
  "static/drawing-preview.js",
  "static/i18n/zh.js",
  "static/i18n/menu-zh.js",
  "static/i18n/en.js",
  "static/i18n/menu-en.js",
  "static/i18n/i18n.js",
];
for (const relative of modularRuntimeFiles) {
  assert(byteSize(relative) <= 12 * 1024, `${relative} must stay <= 12 KiB`);
}

const forbiddenLegacy = [
  "run.py", "web_api.py", "requirements.txt", "requirements-ai.txt",
  "install_ai.bat", "install_ai.sh", "config.json",
  "ai/__init__.py", "ai/geometry.py", "ai/model_manager.py",
  "desktop/prepare_runtime.py", "desktop/desktop_ai_installer.py",
  "desktop/hellolabel-server.spec", "static/version-ui.js",
];
for (const relative of forbiddenLegacy) assert(!exists(relative), `legacy server/runtime file must stay removed in v3.0: ${relative}`);

if (errors.length) {
  console.error("HelloLabel v3.0 static runtime validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`HelloLabel v3.0 static runtime validation passed (${staticReferences.length} bootstrap assets checked).`);
