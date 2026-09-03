import { env, SamModel, AutoProcessor, RawImage, Tensor } from "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.2.0";

const MODEL_ID = "Xenova/slimsam-77-uniform";
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

async function loadRuntime() {
  if (model && processor) return [model, processor];
  if (!processorPromise) processorPromise = AutoProcessor.from_pretrained(MODEL_ID);
  if (!modelPromise) {
    modelPromise = (async () => {
      if (self.navigator?.gpu) {
        try {
          const webgpuModel = await SamModel.from_pretrained(MODEL_ID, { device: "webgpu", dtype: "fp32" });
          device = "webgpu";
          return webgpuModel;
        } catch (error) {
          console.warn("SlimSAM WebGPU load failed; falling back to WASM", error);
        }
      }
      device = "wasm";
      try {
        return await SamModel.from_pretrained(MODEL_ID, { device: "wasm", dtype: "q8" });
      } catch (error) {
        console.warn("SlimSAM q8 WASM load failed; falling back to default dtype", error);
        return SamModel.from_pretrained(MODEL_ID, { device: "wasm" });
      }
    })();
  }
  [model, processor] = await Promise.all([modelPromise, processorPromise]);
  return [model, processor];
}

function cleanupImageUrl() {
  if (!imageObjectUrl) return;
  try { URL.revokeObjectURL(imageObjectUrl); } catch {}
  imageObjectUrl = null;
}

async function encodeImage(buffer, mime) {
  const [m, p] = await loadRuntime();
  cleanupImageUrl();
  imageObjectUrl = URL.createObjectURL(new Blob([buffer], { type: mime || "application/octet-stream" }));
  const image = await RawImage.read(imageObjectUrl);
  imageInputs = await p(image);
  imageEmbeddings = await m.get_image_embeddings(imageInputs);
}

function bestIndex(scores) {
  if (!scores?.length) return 0;
  let best = 0;
  for (let i = 1; i < scores.length; i++) {
    if (Number(scores[i]) > Number(scores[best])) best = i;
  }
  return best;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

function makePromptInputs(prompts, box) {
  const reshaped = imageInputs?.reshaped_input_sizes?.[0];
  if (!reshaped) throw new Error("SAM resized image metadata is missing");
  const rh = Number(reshaped[0]);
  const rw = Number(reshaped[1]);
  const inputs = {};

  const usable = (prompts || []).filter(item => Number.isFinite(item?.x) && Number.isFinite(item?.y));
  if (usable.length) {
    const coords = usable.flatMap(item => [clamp01(item.x) * rw, clamp01(item.y) * rh]);
    const labels = usable.map(item => BigInt(Number(item.label) ? 1 : 0));
    inputs.input_points = new Tensor("float32", coords, [1, 1, usable.length, 2]);
    inputs.input_labels = new Tensor("int64", labels, [1, 1, usable.length]);
  }

  if (box && [box.x1, box.y1, box.x2, box.y2].every(Number.isFinite)) {
    const x1 = clamp01(Math.min(box.x1, box.x2)) * rw;
    const y1 = clamp01(Math.min(box.y1, box.y2)) * rh;
    const x2 = clamp01(Math.max(box.x1, box.x2)) * rw;
    const y2 = clamp01(Math.max(box.y1, box.y2)) * rh;
    inputs.input_boxes = new Tensor("float32", [x1, y1, x2, y2], [1, 1, 4]);
  }

  if (!inputs.input_points && !inputs.input_boxes) {
    throw new Error("At least one SAM point or box prompt is required");
  }
  return inputs;
}

async function decode(prompts, box) {
  if (!imageInputs || !imageEmbeddings) throw new Error("SAM image embedding is not ready");
  const [m, p] = await loadRuntime();
  const promptInputs = makePromptInputs(prompts, box);
  const outputs = await m({ ...imageEmbeddings, ...promptInputs });
  const masks = await p.post_process_masks(outputs.pred_masks, imageInputs.original_sizes, imageInputs.reshaped_input_sizes);
  const scores = outputs.iou_scores?.data || [];
  const index = bestIndex(scores);
  const tensor = masks?.[0]?.[index];
  if (!tensor) throw new Error("SAM returned no usable mask");
  const raw = RawImage.fromTensor(tensor);
  const source = raw.data instanceof Uint8Array ? raw.data : new Uint8Array(raw.data);
  const copy = new Uint8Array(source.length);
  copy.set(source);
  return {
    mask: copy.buffer,
    width: raw.width,
    height: raw.height,
    score: Number(scores[index] || 0)
  };
}

self.onmessage = async event => {
  const request = event.data || {};
  const id = request.id;
  try {
    if (request.type === "reset") {
      imageInputs = null;
      imageEmbeddings = null;
      cleanupImageUrl();
      if (id) self.postMessage({ id, type: "reset", ok: true });
      return;
    }
    if (request.type === "warmup") {
      await loadRuntime();
      self.postMessage({ id, type: "ready", device });
      return;
    }
    if (request.type === "encode") {
      await encodeImage(request.buffer, request.mime);
      self.postMessage({ id, type: "encoded", device });
      return;
    }
    if (request.type === "decode") {
      const result = await decode(request.prompts, request.box);
      self.postMessage({ id, type: "decoded", device, ...result }, [result.mask]);
      return;
    }
    throw new Error(`Unknown SAM worker request: ${request.type}`);
  } catch (error) {
    self.postMessage({ id, type: request.type || "error", error: error?.message || String(error), device });
  }
};
