import { env, Sam2Model, Sam2Processor, RawImage, Tensor } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";
import { extractBestMask } from "./sam-mask-utils.js?v=hellolabel-v150";

const MODEL_ID = "onnx-community/sam2.1-hiera-tiny-ONNX";
env.allowRemoteModels = true;
env.allowLocalModels = false;
env.useBrowserCache = true;

let modelPromise = null;
let processorPromise = null;
let model = null;
let processor = null;
let device = null;
let imageInputs = null;
let imageEmbeddings = null;
let imageObjectUrl = null;
let requestQueue = Promise.resolve();

async function loadRuntime() {
  if (model && processor) return [model, processor];
  if (!processorPromise) processorPromise = Sam2Processor.from_pretrained(MODEL_ID);
  if (!modelPromise) {
    modelPromise = (async () => {
      if (self.navigator?.gpu) {
        try {
          const webgpuModel = await Sam2Model.from_pretrained(MODEL_ID, {
            device: "webgpu",
            dtype: {
              vision_encoder: "fp16",
              prompt_encoder_mask_decoder: "fp32",
            },
          });
          device = "webgpu";
          return webgpuModel;
        } catch (error) {
          console.warn("SAM2.1 WebGPU load failed; falling back to WASM", error);
        }
      }
      device = "wasm";
      try {
        return await Sam2Model.from_pretrained(MODEL_ID, {
          device: "wasm",
          dtype: {
            vision_encoder: "q8",
            prompt_encoder_mask_decoder: "fp32",
          },
        });
      } catch (error) {
        console.warn("SAM2.1 q8 WASM load failed; falling back to fp16/fp32", error);
        return Sam2Model.from_pretrained(MODEL_ID, {
          device: "wasm",
          dtype: {
            vision_encoder: "fp16",
            prompt_encoder_mask_decoder: "fp32",
          },
        });
      }
    })();
  }
  [model, processor] = await Promise.all([modelPromise, processorPromise]);
  return [model, processor];
}

function isTensorLike(value) {
  return !!value && typeof value === "object" && Array.isArray(value.dims) && typeof value.dispose === "function";
}

function disposeTensorTree(value, seen = new Set()) {
  if (!value || (typeof value !== "object" && typeof value !== "function") || seen.has(value)) return;
  seen.add(value);
  if (isTensorLike(value)) {
    try { value.dispose(); } catch {}
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) disposeTensorTree(item, seen);
    return;
  }
  for (const item of Object.values(value)) disposeTensorTree(item, seen);
}

function cleanupImageUrl() {
  if (!imageObjectUrl) return;
  try { URL.revokeObjectURL(imageObjectUrl); } catch {}
  imageObjectUrl = null;
}

function releaseImageState() {
  disposeTensorTree(imageEmbeddings);
  disposeTensorTree(imageInputs);
  imageEmbeddings = null;
  imageInputs = null;
  cleanupImageUrl();
}

async function encodeImage(buffer, mime) {
  const [m, p] = await loadRuntime();
  let nextInputs = null;
  let nextEmbeddings = null;
  cleanupImageUrl();
  imageObjectUrl = URL.createObjectURL(new Blob([buffer], { type: mime || "application/octet-stream" }));
  try {
    const image = await RawImage.read(imageObjectUrl);
    nextInputs = await p(image);
    nextEmbeddings = await m.get_image_embeddings(nextInputs);

    // The vision encoder no longer needs pixel_values after embeddings are built.
    // Keep only the size metadata required by prompt/mask post-processing.
    const metadata = {
      original_sizes: nextInputs.original_sizes,
      reshaped_input_sizes: nextInputs.reshaped_input_sizes,
    };
    if (nextInputs.pixel_values) {
      disposeTensorTree(nextInputs.pixel_values);
      delete nextInputs.pixel_values;
    }

    releaseImageState();
    imageInputs = metadata;
    imageEmbeddings = nextEmbeddings;
    nextEmbeddings = null;
  } finally {
    cleanupImageUrl();
    disposeTensorTree(nextInputs);
    disposeTensorTree(nextEmbeddings);
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function makePromptInputs(prompts, box) {
  const reshaped = imageInputs?.reshaped_input_sizes?.[0];
  if (!reshaped) throw new Error("SAM2.1 resized image metadata is missing");
  const rh = Number(reshaped[0]);
  const rw = Number(reshaped[1]);
  const inputs = {};

  const usable = (prompts || []).filter(item => Number.isFinite(item?.x) && Number.isFinite(item?.y));
  if (usable.length) {
    inputs.input_points = new Tensor(
      "float32",
      usable.flatMap(item => [clamp01(item.x) * rw, clamp01(item.y) * rh]),
      [1, 1, usable.length, 2]
    );
    inputs.input_labels = new Tensor(
      "int64",
      usable.map(item => BigInt(Number(item.label) ? 1 : 0)),
      [1, 1, usable.length]
    );
  }

  if (box && [box.x1, box.y1, box.x2, box.y2].every(Number.isFinite)) {
    const x1 = clamp01(Math.min(box.x1, box.x2)) * rw;
    const y1 = clamp01(Math.min(box.y1, box.y2)) * rh;
    const x2 = clamp01(Math.max(box.x1, box.x2)) * rw;
    const y2 = clamp01(Math.max(box.y1, box.y2)) * rh;
    inputs.input_boxes = new Tensor("float32", [x1, y1, x2, y2], [1, 1, 4]);
  }

  if (!inputs.input_points && !inputs.input_boxes) throw new Error("At least one SAM2.1 point or box prompt is required");
  return inputs;
}

async function decode(prompts, box) {
  if (!imageInputs || !imageEmbeddings) throw new Error("SAM2.1 image embedding is not ready");
  const [m, p] = await loadRuntime();
  const promptInputs = makePromptInputs(prompts, box);
  let outputs = null;
  let masks = null;
  try {
    outputs = await m({ ...imageEmbeddings, ...promptInputs });
    masks = await p.post_process_masks(outputs.pred_masks, imageInputs.original_sizes, imageInputs.reshaped_input_sizes);
    const scores = outputs.iou_scores?.data || [];
    const selected = extractBestMask(masks, scores);
    return {
      mask: selected.mask,
      width: selected.width,
      height: selected.height,
      score: Number(scores[selected.index] || 0),
    };
  } finally {
    disposeTensorTree(masks);
    disposeTensorTree(outputs);
    disposeTensorTree(promptInputs);
  }
}

async function handleRequest(request) {
  const id = request.id;
  try {
    if (request.type === "reset") {
      releaseImageState();
      if (id) self.postMessage({ id, type: "reset", ok: true, model: MODEL_ID, device });
      return;
    }
    if (request.type === "warmup") {
      await loadRuntime();
      self.postMessage({ id, type: "ready", model: MODEL_ID, device });
      return;
    }
    if (request.type === "encode") {
      await encodeImage(request.buffer, request.mime);
      self.postMessage({ id, type: "encoded", model: MODEL_ID, device });
      return;
    }
    if (request.type === "decode") {
      const result = await decode(request.prompts, request.box);
      self.postMessage({ id, type: "decoded", model: MODEL_ID, device, ...result }, [result.mask]);
      return;
    }
    throw new Error(`Unknown SAM2.1 worker request: ${request.type}`);
  } catch (error) {
    self.postMessage({ id, type: request.type || "error", error: error?.message || String(error), model: MODEL_ID, device });
  }
}

self.onmessage = event => {
  const request = event.data || {};
  requestQueue = requestQueue.then(() => handleRequest(request));
};
