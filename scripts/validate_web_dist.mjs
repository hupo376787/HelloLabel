import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const dist = path.join(root, "dist", "web");
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const exists = relative => fs.existsSync(path.join(dist, relative));
const read = relative => fs.readFileSync(path.join(dist, relative), "utf8");

assert(exists("index.html"), "dist/web/index.html is missing");
assert(exists("VERSION.txt"), "dist/web/VERSION.txt is missing");
assert(exists("static/app.js"), "dist/web/static/app.js is missing");
assert(exists("static/app-core.js"), "dist/web/static/app-core.js is missing");
assert(exists("static/browser-runtime.js"), "dist/web/static/browser-runtime.js is missing");
assert(exists("static/browser-sam-runtime.js"), "dist/web/static/browser-sam-runtime.js is missing");
assert(exists("static/browser-yolo-runtime.js"), "dist/web/static/browser-yolo-runtime.js is missing");
assert(exists("static/sam-worker.js"), "dist/web/static/sam-worker.js is missing");
assert(exists("static/sam-mask-utils.js"), "dist/web/static/sam-mask-utils.js is missing");
assert(!exists("static/index.html"), "dist/web/static/index.html should not duplicate the site root index.html");

if (exists("VERSION.txt")) {
  assert(read("VERSION.txt").trim() === "HelloLabel 1.5.0 - browser-only static runtime", "VERSION.txt must identify the v1.5.0 browser-only runtime");
}
if (exists("index.html")) {
  const index = read("index.html");
  assert(index.includes('/static/app.js'), "distribution index.html must load /static/app.js");
}

const forbiddenNames = new Set([
  "run.py",
  "web_api.py",
  "requirements.txt",
  "requirements-ai.txt",
  "install_ai.bat",
  "install_ai.sh",
  "prepare_runtime.py",
  "desktop_ai_installer.py",
  "hellolabel-server.spec",
]);

function walk(directory, relative = "") {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const nextRelative = path.join(relative, entry.name);
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(absolute, nextRelative);
    else if (forbiddenNames.has(entry.name)) errors.push(`server/runtime file leaked into web distribution: ${nextRelative}`);
  }
}

if (fs.existsSync(dist)) walk(dist);

if (errors.length) {
  console.error("HelloLabel v1.5 web distribution validation failed:\n");
  for (const error of errors) console.error(` - ${error}`);
  process.exit(1);
}

console.log("HelloLabel v1.5 web distribution validation passed.");
