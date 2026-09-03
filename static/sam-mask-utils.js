"use strict";

export function bestMaskIndex(scores) {
  if (!scores?.length) return 0;
  let best = 0;
  for (let i = 1; i < scores.length; i++) {
    if (Number(scores[i]) > Number(scores[best])) best = i;
  }
  return best;
}

export function extractBestMask(masks, scores) {
  // Transformers.js SamImageProcessor.post_process_masks() returns one Tensor
  // per source image. With one interactive object the tensor shape is normally
  // [1, candidates, H, W]. Numeric Tensor indexing returns a lower-rank Tensor.
  const imageMasks = masks?.[0];
  if (!imageMasks?.dims || imageMasks.dims.length < 3) {
    throw new Error("SAM2.1 returned an unexpected mask tensor");
  }

  const candidateMasks = imageMasks.dims.length === 4 ? imageMasks[0] : imageMasks;
  if (!candidateMasks?.dims || candidateMasks.dims.length !== 3) {
    throw new Error(`SAM2.1 candidate mask shape is invalid: ${JSON.stringify(candidateMasks?.dims || [])}`);
  }

  const candidateCount = Number(candidateMasks.dims[0] || 0);
  if (!candidateCount) throw new Error("SAM2.1 returned no mask candidates");

  const index = Math.min(bestMaskIndex(scores), candidateCount - 1);
  const tensor = candidateMasks[index];
  if (!tensor?.dims || tensor.dims.length !== 2) {
    throw new Error(`SAM2.1 selected mask shape is invalid: ${JSON.stringify(tensor?.dims || [])}`);
  }

  const height = Number(tensor.dims[0] || 0);
  const width = Number(tensor.dims[1] || 0);
  if (!width || !height || tensor.data?.length !== width * height) {
    throw new Error("SAM2.1 selected mask data does not match its dimensions");
  }

  const copy = new Uint8Array(tensor.data.length);
  for (let i = 0; i < tensor.data.length; i++) copy[i] = tensor.data[i] ? 1 : 0;
  return { mask: copy.buffer, width, height, index };
}
