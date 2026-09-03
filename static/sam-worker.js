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
      } catch {
        return SamModel.from_pretrained(MODEL_ID);
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
  for (let i = 1; i < scores.length; i++) if (Number(scores[i]) > Number(scores[best])) best = i;
  return best;
}

async function decode(prompts) {
  if (!imageInputs || !imageEmbeddings) throw new Error("SAM image embedding is not ready");
  const [m, p] = await loadRuntime();
  const reshaped = imageInputs.reshaped_input_sizes[0];
  const rh = Number(reshaped[0]), rw = Number(reshaped[1]);
  const usable = (prompts || []).filter(item => Number.isFinite(item.x) && Number.isFinite(item.y));
  if (!usable.length) throw new Error("At least one SAM prompt is required");
  const coords = usable.map(item => [Number(item.x) * rw, Number(item.y) * rh]);
  const labels = usable.map(item => BigInt(Number(item.label) ? 1 : 0));
  const input_points = new Tensor("float32", coords.flat(), [1, 1, coords.length, 2]);
  const input_labels = new Tensor("int64", labels, [1, 1, labels.length]);
  const outputs = await m({ ...imageEmbeddings, input_points, input_labels });
  const masks = await p.post_process_masks(outputs.pred_masks, imageInputs.original_sizes, imageInputs.reshaped_input_sizes);
  const scores = outputs.iou_scores.data;
  const index = bestIndex(scores);
  const tensor = masks[0][index];
  const raw = RawImage.fromTensor(tensor);
  const data = raw.data instanceof Uint8Array ? raw.data : new Uint8Array(raw.data);
  const copy = new Uint8Array(data.length);
  copy.set(data);
  return { mask: copy.buffer, width: raw.width, height: raw.height, score: Number(scores[index] || 0) };
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
      const result = await decode(request.prompts);
      self.postMessage({ id, type: "decoded", device, ...result }, [result.mask]);
      return;
    }
    throw new Error(`Unknown SAM worker request: ${request.type}`);
  } catch (error) {
    self.postMessage({ id, type: request.type || "error", error: error?.message || String(error), device });
  }
};
