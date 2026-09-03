import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const source = fs.readFileSync("static/browser-mask-geometry.js", "utf8");
const context = vm.createContext({ window: {}, console, Uint8Array, Math, Number, Infinity, Map, Set });
vm.runInContext(source, context, { filename: "browser-mask-geometry.js" });
const api = context.window.helloLabelMaskGeometry;
assert.ok(api?.geometryFromMask, "mask geometry API must be exported");

function mask(width, height, regions) {
  const data = new Uint8Array(width * height);
  for (const [x1, y1, x2, y2] of regions) {
    for (let y = y1; y < y2; y++) for (let x = x1; x < x2; x++) data[y * width + x] = 1;
  }
  return data;
}

function area(points) {
  let value = 0;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    value += points[j][0] * points[i][1] - points[i][0] * points[j][1];
  }
  return Math.abs(value / 2);
}

{
  const width = 12, height = 11;
  const data = mask(width, height, [[2, 3, 7, 8]]);
  const rectangle = api.geometryFromMask(data, width, height, "rectangle");
  assert.deepEqual(JSON.parse(JSON.stringify(rectangle)), [[2, 3], [7, 8]], "rectangle conversion must use the mask cell border");

  const polygon = api.geometryFromMask(data, width, height, "polygon");
  assert.ok(polygon.length >= 4, "rectangle mask polygon must have at least four vertices");
  assert.equal(area(polygon), 25, "rectangle mask contour must preserve its 5x5 area");

  const obb = api.geometryFromMask(data, width, height, "oriented_rectangle");
  assert.equal(obb.length, 4, "oriented rectangle must have four points");

  const circle = api.geometryFromMask(data, width, height, "circle");
  assert.equal(circle.length, 2, "circle must use Labelme center + circumference point format");
  assert.ok(circle[1][0] > circle[0][0], "circle radius must be positive");
}

{
  const width = 20, height = 12;
  const data = mask(width, height, [
    [1, 1, 7, 9],
    [13, 3, 17, 7],
  ]);
  const largest = api.geometryFromMask(data, width, height, "rectangle");
  assert.deepEqual(JSON.parse(JSON.stringify(largest)), [[1, 1], [7, 9]], "without an anchor the largest component must win");

  const anchored = api.geometryFromMask(data, width, height, "rectangle", { anchor: [15, 5] });
  assert.deepEqual(JSON.parse(JSON.stringify(anchored)), [[13, 3], [17, 7]], "anchor must select the intended disconnected component");
}

{
  const width = 9, height = 9;
  const data = new Uint8Array(width * height);
  // Concave L-shaped mask. The contour must remain a usable non-zero polygon.
  for (let y = 1; y <= 6; y++) for (let x = 1; x <= 2; x++) data[y * width + x] = 1;
  for (let y = 5; y <= 6; y++) for (let x = 1; x <= 6; x++) data[y * width + x] = 1;
  const polygon = api.geometryFromMask(data, width, height, "polygon");
  assert.ok(polygon.length >= 6, "concave contour must retain its bend vertices");
  assert.ok(area(polygon) > 0, "concave contour must have positive area");
}

console.log("HelloLabel browser mask geometry tests passed.");
