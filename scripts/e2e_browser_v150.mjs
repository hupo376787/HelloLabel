import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import { chromium } from "playwright";

const ROOT = process.cwd();
const HOST = "127.0.0.1";
const PORT = Number(process.env.HELLOLABEL_E2E_PORT || 19010);
const APP_URL = `http://${HOST}:${PORT}/static/`;
const IMAGE_PATH = process.env.HELLOLABEL_E2E_IMAGE || path.join(ROOT, "tests", "fixtures", "bus.jpg");
const ARTIFACT_DIR = path.join(ROOT, "artifacts", "e2e-v150");
const AI_TIMEOUT = Number(process.env.HELLOLABEL_AI_TIMEOUT_MS || 480000);

fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

const report = {
  version: "1.5.0",
  startedAt: new Date().toISOString(),
  browser: {},
  phases: [],
  consoleErrors: [],
  pageErrors: [],
  result: "running",
};

function step(name, details = {}) {
  const item = { at: new Date().toISOString(), ...details, name };
  report.phases.push(item);
  console.log(`[E2E] ${name}${Object.keys(details).length ? ` ${JSON.stringify(details)}` : ""}`);
  return item;
}

function writeReport() {
  report.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(ARTIFACT_DIR, "browser-report.json"), JSON.stringify(report, null, 2));
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".wasm": "application/wasm",
  ".onnx": "application/octet-stream",
};

function safeFile(url) {
  let pathname = decodeURIComponent(String(url || "/").split("?")[0]);
  if (pathname.endsWith("/")) pathname += "index.html";
  const relative = pathname.replace(/^\/+/, "");
  const target = path.resolve(ROOT, relative);
  if (!target.startsWith(path.resolve(ROOT) + path.sep)) return null;
  return target;
}

function startServer() {
  const server = http.createServer((req, res) => {
    const target = safeFile(req.url);
    const headers = {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Resource-Policy": "same-origin",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    };
    if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      res.writeHead(404, { ...headers, "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { ...headers, "Content-Type": MIME[ext] || "application/octet-stream" });
    fs.createReadStream(target).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(PORT, HOST, () => resolve(server));
  });
}

async function waitForApp(page) {
  await page.waitForFunction(() => {
    return !!document.getElementById("openFolderBtn") &&
      window.helloLabelBrowserRuntime?.mode === "browser-only" &&
      typeof window.showDirectoryPicker === "function";
  }, null, { timeout: 30000 });
}

async function seedOpfs(page, imageBytes) {
  const base64 = imageBytes.toString("base64");
  return page.evaluate(async ({ base64 }) => {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry("HelloLabelE2E", { recursive: true }); } catch {}
    const dir = await root.getDirectoryHandle("HelloLabelE2E", { create: true });
    for (const name of ["01_bus.jpg", "02_bus.jpg", "03_bus.jpg"]) {
      const fileHandle = await dir.getFileHandle(name, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(new Blob([bytes], { type: "image/jpeg" }));
      await writable.close();
    }
    window.__hellolabelE2EDir = dir;
    return { name: dir.name, kind: dir.kind };
  }, { base64 });
}

async function readOpfsJson(page, name, { allowMissing = false } = {}) {
  return page.evaluate(async ({ name, allowMissing }) => {
    try {
      const handle = await window.__hellolabelE2EDir.getFileHandle(name);
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    } catch (error) {
      if (allowMissing && error?.name === "NotFoundError") return null;
      throw error;
    }
  }, { name, allowMissing });
}

async function waitForJsonShapes(page, name, minimum, timeout = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeout) {
    const json = await readOpfsJson(page, name, { allowMissing: true });
    if (json?.shapes?.length >= minimum) return json;
    await page.waitForTimeout(150);
  }
  throw new Error(`${name} did not reach ${minimum} saved shape(s)`);
}

async function waitNotBusy(page, timeout = AI_TIMEOUT) {
  await page.waitForFunction(() => {
    const busy = document.getElementById("busy");
    if (!busy) return true;
    return busy.classList.contains("hidden") || busy.hidden || getComputedStyle(busy).display === "none";
  }, null, { timeout });
}

async function waitActiveFile(page, name) {
  await page.waitForFunction(expected => {
    try { return state.imageName === expected; } catch { return false; }
  }, name, { timeout: 15000 });
  // state.imageName is assigned before loadPreview()/JSON parsing finishes. Waiting
  // for the busy overlay to clear makes this an actual "image + JSON ready" check
  // rather than reading the previous image's stale instance count.
  await waitNotBusy(page, 15000);
  await page.waitForFunction(() => {
    const img = document.getElementById("imageView");
    return !!img?.src && img.naturalWidth > 0 && img.naturalHeight > 0;
  }, null, { timeout: 15000 });
}

async function clickFile(page, name) {
  await page.locator(`.file-item[data-name="${name}"]`).click();
  await waitActiveFile(page, name);
}

async function imageBox(page) {
  const box = await page.locator("#imageView").boundingBox();
  assert(box && box.width > 100 && box.height > 100, "image viewport is not visible or too small");
  return box;
}

async function runYolo(page, modelId, output = "polygon") {
  await page.selectOption("#yoloModelSelect", modelId);
  if (modelId === "yolo11-seg") await page.selectOption("#yoloOutputSelect", output);
  await page.locator("#yoloRunBtn").click();
  await waitNotBusy(page);
  const result = await page.evaluate(modelId => ({
    modelLoaded: window.helloLabelBrowserRuntime?.yolo?.models?.has?.(modelId) || false,
    device: window.helloLabelBrowserRuntime?.yolo?.devices?.get?.(modelId) || null,
    count: Number(document.getElementById("instanceCount")?.textContent || 0),
    status: document.getElementById("statusText")?.textContent || "",
  }), modelId);
  if (result.count <= 0) throw new Error(`${modelId} completed without detections: ${result.status || "no status"}`);
  return result;
}

async function samRound(page, action) {
  await action();
  await waitNotBusy(page);
  const snapshot = await page.evaluate(() => ({
    path: document.getElementById("aiPreviewPath")?.getAttribute("d") || "",
    hidden: document.getElementById("aiPreviewPath")?.classList.contains("hidden-svg") ?? true,
    points: state.sam.points.map(point => [...point]),
    labels: [...state.sam.labels],
    box: state.sam.box ? [...state.sam.box] : null,
    historyLength: state.sam.history.length,
    requestSeq: state.sam.requestSeq,
    status: document.getElementById("statusText")?.textContent || "",
  }));
  if (snapshot.hidden || snapshot.path.length <= 8) throw new Error(`SAM2.1 completed without a preview: ${snapshot.status || "no status"}`);
  return snapshot;
}

let server = null;
let browser = null;
let page = null;

try {
  assert(fs.existsSync(IMAGE_PATH), `E2E image is missing: ${IMAGE_PATH}`);
  const imageBytes = fs.readFileSync(IMAGE_PATH);
  assert(imageBytes.length > 10000, "E2E image fixture is unexpectedly small");

  server = await startServer();
  step("static server started", { url: APP_URL });

  browser = await chromium.launch({
    headless: true,
    args: [
      "--enable-unsafe-webgpu",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
      "--use-angle=swiftshader",
    ],
  });
  const context = await browser.newContext({ viewport: { width: 1500, height: 940 } });
  await context.addInitScript(() => {
    try {
      localStorage.setItem("hellolabel-language", "en");
      localStorage.setItem("hellolabel-global-labels-v1", JSON.stringify({
        schema: 1,
        product: "HelloLabel",
        type: "label-library",
        labels: { "e2e-manual": { color: "#38c172" } },
      }));
    } catch {}
    Object.defineProperty(window, "showDirectoryPicker", {
      configurable: true,
      value: async () => {
        if (!window.__hellolabelE2EDir) throw new Error("E2E directory is not seeded yet");
        return window.__hellolabelE2EDir;
      },
    });
  });

  page = await context.newPage();
  page.on("console", message => {
    const line = `[browser:${message.type()}] ${message.text()}`;
    console.log(line);
    if (message.type() === "error") report.consoleErrors.push(line);
  });
  page.on("pageerror", error => {
    const line = error?.stack || error?.message || String(error);
    console.error(`[pageerror] ${line}`);
    report.pageErrors.push(line);
  });
  page.on("dialog", async dialog => {
    const line = `[browser:dialog:${dialog.type()}] ${dialog.message()}`;
    console.log(line);
    if (dialog.type() === "alert") report.consoleErrors.push(line);
    await dialog.dismiss().catch(() => {});
  });

  await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForApp(page);
  report.browser = await page.evaluate(() => ({
    userAgent: navigator.userAgent,
    secureContext: window.isSecureContext,
    crossOriginIsolated: window.crossOriginIsolated,
    webgpu: !!navigator.gpu,
    runtimeVersion: window.helloLabelBrowserRuntime?.version || null,
    runtimeMode: window.helloLabelBrowserRuntime?.mode || null,
  }));
  assert(report.browser.runtimeVersion === "1.5.0", `unexpected runtime version: ${report.browser.runtimeVersion}`);
  assert(report.browser.runtimeMode === "browser-only", "runtime is not browser-only");
  step("browser runtime ready", report.browser);

  const opfs = await seedOpfs(page, imageBytes);
  step("OPFS test directory seeded", opfs);

  await page.locator("#openFolderBtn").click();
  await page.waitForFunction(() => document.getElementById("imageCount")?.textContent?.includes("3"), null, { timeout: 15000 });
  step("folder opened", { imageCount: await page.locator("#imageCount").textContent() });
  await clickFile(page, "01_bus.jpg");
  step("first image opened", { image: "01_bus.jpg" });

  // Manual rectangle + immediate image switch. This intentionally switches before
  // the 300 ms debounce expires so openImageEntry() must flush the pending save.
  await page.locator('.label-row[data-label="e2e-manual"]').click();
  await page.locator("#rectBtn").click();
  let box = await imageBox(page);
  await page.mouse.click(box.x + box.width * 0.22, box.y + box.height * 0.25);
  await page.mouse.click(box.x + box.width * 0.48, box.y + box.height * 0.55);
  await page.waitForFunction(() => Number(document.getElementById("instanceCount")?.textContent || 0) === 1, null, { timeout: 10000 });
  await clickFile(page, "02_bus.jpg");
  const manualJson = await waitForJsonShapes(page, "01_bus.json", 1);
  assert(manualJson.shapes[0].label === "e2e-manual", "autosaved manual shape has the wrong label");
  assert(manualJson.shapes[0].shape_type === "rectangle", "autosaved manual shape is not a rectangle");
  step("manual annotation autosave + switch flush passed", { shapes: manualJson.shapes.length });

  // Real YOLO11 Detect: model/runtime download, browser inference, annotation write.
  const detect = await runYolo(page, "yolo11-detect");
  assert(detect.modelLoaded, "YOLO11 Detect model did not remain loaded in browser runtime");
  const detectJson = await waitForJsonShapes(page, "02_bus.json", 1, 30000);
  assert(detectJson.shapes.every(shape => shape.shape_type === "rectangle"), "YOLO11 Detect produced a non-rectangle shape");
  step("YOLO11 Detect real inference passed", { device: detect.device, shapes: detectJson.shapes.length });

  // Real YOLO11 Seg: require at least one contour with >4 vertices so this proves
  // the composite RGBA segmentation mask was converted, rather than bbox fallback.
  await clickFile(page, "03_bus.jpg");
  const seg = await runYolo(page, "yolo11-seg", "polygon");
  assert(seg.modelLoaded, "YOLO11 Seg model did not remain loaded in browser runtime");
  const segJson = await waitForJsonShapes(page, "03_bus.json", 1, 30000);
  const polygonSizes = segJson.shapes.filter(shape => shape.shape_type === "polygon").map(shape => shape.points?.length || 0);
  assert(polygonSizes.some(size => size > 4), `YOLO11 Seg did not produce a real mask contour; polygon sizes=${polygonSizes.join(",")}`);
  step("YOLO11 Seg real mask inference passed", { device: seg.device, shapes: segJson.shapes.length, polygonSizes });

  // Real SAM2.1 Tiny multi-round interaction: positive point -> negative point ->
  // box prompt -> accept. The preview itself may remain geometrically identical
  // after a useful extra prompt, so verify the actual application prompt state.
  const beforeSam = segJson.shapes.length;
  await page.locator("#samModeBtn").click();
  box = await imageBox(page);
  let samState = await samRound(page, async () => {
    await page.mouse.click(box.x + box.width * 0.50, box.y + box.height * 0.52);
  });
  assert(samState.historyLength === 1 && samState.points.length === 1 && samState.labels[0] === 1, "SAM2.1 positive prompt was not recorded correctly");

  samState = await samRound(page, async () => {
    await page.mouse.click(box.x + box.width * 0.92, box.y + box.height * 0.10, { button: "right" });
  });
  assert(samState.historyLength === 2 && samState.points.length === 2 && samState.labels.includes(0), "SAM2.1 negative prompt was not recorded correctly");

  samState = await samRound(page, async () => {
    await page.mouse.move(box.x + box.width * 0.08, box.y + box.height * 0.22);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.94, box.y + box.height * 0.90, { steps: 8 });
    await page.mouse.up();
  });
  assert(samState.historyLength === 3 && Array.isArray(samState.box) && samState.box.length === 4, "SAM2.1 box prompt was not recorded correctly");

  const samRuntime = await page.evaluate(() => ({
    loaded: !!window.helloLabelBrowserRuntime?.sam?.loaded,
    device: window.helloLabelBrowserRuntime?.sam?.device || null,
    model: window.helloLabelBrowserRuntime?.sam?.model || null,
    promptMarkers: document.getElementById("samPrompts")?.childElementCount || 0,
  }));
  assert(samRuntime.loaded, "SAM2.1 runtime is not marked loaded after inference");
  await page.keyboard.press("Enter");
  const samJson = await waitForJsonShapes(page, "03_bus.json", beforeSam + 1, 30000);
  step("SAM2.1 multi-prompt inference passed", { ...samRuntime, promptHistory: samState.historyLength, shapesAfterAccept: samJson.shapes.length });

  // Repeatedly switch images and reload their JSON. This catches stale preview,
  // pending-save, reset/encode races, and obvious long-session state failures.
  const expectedCounts = {
    "01_bus.jpg": manualJson.shapes.length,
    "02_bus.jpg": detectJson.shapes.length,
    "03_bus.jpg": samJson.shapes.length,
  };
  const sequence = ["01_bus.jpg", "02_bus.jpg", "03_bus.jpg", "02_bus.jpg", "01_bus.jpg", "03_bus.jpg"];
  for (let round = 0; round < 3; round++) {
    for (const name of sequence) {
      await clickFile(page, name);
      const count = Number(await page.locator("#instanceCount").textContent());
      assert(count === expectedCounts[name], `continuous switch count mismatch for ${name}: expected ${expectedCounts[name]}, got ${count}`);
    }
  }
  step("continuous image switching passed", { switches: sequence.length * 3, expectedCounts });

  const caches = await page.evaluate(async () => {
    try { return "caches" in window ? await caches.keys() : []; } catch { return []; }
  });
  report.browser.cacheNames = caches;

  assert(report.pageErrors.length === 0, `browser emitted page errors: ${report.pageErrors.join(" | ")}`);
  report.result = "passed";
  step("browser E2E chain passed", { cacheNames: caches });
  writeReport();
} catch (error) {
  report.result = "failed";
  report.error = error?.stack || error?.message || String(error);
  console.error(`[E2E FAILED] ${report.error}`);
  if (page) {
    try { await page.screenshot({ path: path.join(ARTIFACT_DIR, "browser-failure.png"), fullPage: true }); } catch {}
    try {
      report.failureState = await page.evaluate(() => ({
        status: document.getElementById("statusText")?.textContent || "",
        saveState: document.getElementById("saveState")?.textContent || "",
        imageCount: document.getElementById("imageCount")?.textContent || "",
        instanceCount: document.getElementById("instanceCount")?.textContent || "",
        busy: document.getElementById("busyText")?.textContent || "",
        imageName: (() => { try { return state.imageName || ""; } catch { return ""; } })(),
        sam: {
          loaded: !!window.helloLabelBrowserRuntime?.sam?.loaded,
          device: window.helloLabelBrowserRuntime?.sam?.device || null,
          model: window.helloLabelBrowserRuntime?.sam?.model || null,
        },
        yoloDevices: window.helloLabelBrowserRuntime?.yolo?.devices
          ? Object.fromEntries(window.helloLabelBrowserRuntime.yolo.devices.entries())
          : {},
      }));
    } catch {}
  }
  writeReport();
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) await new Promise(resolve => server.close(resolve));
}
