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
const desktopMain = read("desktop/main.cjs");
const desktopPackage = JSON.parse(read("desktop/package.json"));
const workflow = read(".github/workflows/desktop-build.yml");
const startBat = read("start_web.bat");
const startSh = read("start_web.sh");

assert(desktopPackage.version === "1.5.0", "desktop/package.json must be version 1.5.0");
assert(desktopPackage.build?.extraResources?.some(item => item.from === "../static" && item.to === "static"), "desktop package must bundle ../static as resources/static");
assert(!JSON.stringify(desktopPackage.build?.extraResources || []).includes("runtime"), "desktop package must not bundle a Python runtime");
assert(!/child_process|spawn\s*\(|execFile\s*\(|exec\s*\(|web_api\.py|run\.py|fastapi|uvicorn/i.test(desktopMain), "desktop/main.cjs must not launch Python/FastAPI");
assert(!/prepare_runtime|setup-python|pip install|\buv\b/i.test(workflow), "desktop CI must not prepare Python runtime");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startBat), "start_web.bat must be static-server only");
assert(!/run\.py|fastapi|uvicorn|requirements\.txt/i.test(startSh), "start_web.sh must be static-server only");
assert(browserRuntime.includes('mode: "browser-only"'), "browser-runtime.js must declare browser-only mode");
assert(browserRuntime.includes('/^\\/api\\//'), "browser-runtime.js must block legacy /api calls");
assert(app.includes("browser-model-cache.js"), "app bootstrap must load browser model cache");
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
  "static/browser-runtime-ui.js",
  "static/browser-event-rebind.js",
  "static/sam-worker.js",
  "static/modal-focus-fix.js",
  "static/global-labels.js",
  "static/geometry-edit.js",
  "static/polygon-snap-visual.js",
  "static/rectangle-crosshair.js",
  "deploy/nginx.conf.example",
  "build_web.bat",
  "build_web.sh"
];
for (const relative of required) assert(exists(relative), `required v1.5 file is missing: ${relative}`);

if (errors.length) {
  console.error("HelloLabel v1.5 static runtime validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log(`HelloLabel v1.5 static runtime validation passed (${staticReferences.length} bootstrap assets checked).`);
