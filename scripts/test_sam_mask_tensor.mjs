import assert from "node:assert/strict";
import { bestMaskIndex, extractBestMask } from "../static/sam-mask-utils.js";

function maskTensor(values, height, width) {
  return { dims: [height, width], data: Uint8Array.from(values) };
}

const first = maskTensor([
  1, 0, 0,
  0, 0, 0,
], 2, 3);
const second = maskTensor([
  0, 1, 1,
  0, 1, 0,
], 2, 3);
const third = maskTensor([
  0, 0, 0,
  1, 1, 1,
], 2, 3);

const candidateMasks = {
  dims: [3, 2, 3],
  0: first,
  1: second,
  2: third,
};
const imageMasks = {
  dims: [1, 3, 2, 3],
  0: candidateMasks,
};

assert.equal(bestMaskIndex(Float32Array.from([0.1, 0.91, 0.4])), 1);

const selected = extractBestMask([imageMasks], Float32Array.from([0.1, 0.91, 0.4]));
assert.equal(selected.index, 1);
assert.equal(selected.width, 3);
assert.equal(selected.height, 2);
assert.deepEqual([...new Uint8Array(selected.mask)], [0, 1, 1, 0, 1, 0]);

// The returned buffer must be detached from the source tensor storage so it is
// safe to transfer from the worker without corrupting cached post-processed masks.
second.data[1] = 0;
assert.deepEqual([...new Uint8Array(selected.mask)], [0, 1, 1, 0, 1, 0]);

assert.throws(
  () => extractBestMask([{ dims: [1, 3, 2, 3], 0: { dims: [3, 2], data: new Uint8Array(6) } }], [1, 0, 0]),
  /candidate mask shape is invalid/,
);

console.log("SAM2.1 mask tensor extraction tests passed.");
