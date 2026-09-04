import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

// Keep the proven browser acceptance chain while the v2.1 release only changes
// product/runtime versioning. Generate a v2.1 copy at runtime so the assertions,
// report metadata and artifact directory all match the current release without
// duplicating the large acceptance script in the repository.
const scriptsDir = path.dirname(new URL(import.meta.url).pathname);
const legacyPath = path.join(scriptsDir, "e2e_browser_v150.mjs");
const generatedPath = path.join(scriptsDir, ".e2e_browser_v210.generated.mjs");

const source = fs.readFileSync(legacyPath, "utf8")
  .replaceAll('"1.5.0"', '"2.1.0"')
  .replaceAll("e2e-v150", "e2e-v210");

fs.writeFileSync(generatedPath, source, "utf8");
try {
  await import(`${pathToFileURL(generatedPath).href}?v=2.1.0`);
} finally {
  fs.rmSync(generatedPath, { force: true });
}
