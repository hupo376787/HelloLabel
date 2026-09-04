"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  const geometry = window.helloLabelMaskGeometry;
  if (!runtime?.sam || !geometry) return;

  const MODEL_ID = "onnx-community/sam2.1-hiera-tiny-ONNX";
  const REQUEST_TIMEOUT_MS = 600000;
  const text = (zh, en) => state?.language === "en" ? en : zh;

  if (els.samModelSelect) {
    els.samModelSelect.replaceChildren();
    const option = document.createElement("option");
    option.value = "sam2-browser";
    option.textContent = "SAM2.1 Tiny (Browser)";
    els.samModelSelect.appendChild(option);
  }

  function resetWorker(worker, error) {
    const sam = runtime.sam;
    for (const [id, pending] of sam.pending.entries()) {
      if (pending.worker !== worker) continue;
      clearTimeout(pending.timer);
      sam.pending.delete(id);
      pending.reject(error);
    }
    if (sam.worker === worker) {
      try { worker.terminate(); } catch {}
      sam.worker = null;
      sam.ready = false;
      sam.loaded = false;
      sam.imageKey = null;
      sam.encodePromise = null;
    }
  }

  function ensureWorker() {
    const sam = runtime.sam;
    if (sam.worker) return sam.worker;
    const worker = new Worker("/static/sam-worker.js?v=hellolabel-v150", { type: "module" });
    sam.worker = worker;
    worker.addEventListener("message", event => {
      const data = event.data || {};
      if (data.type === "ready" || data.type === "encoded" || data.type === "decoded") {
        sam.ready = true;
        sam.loaded = true;
        sam.device = data.device || sam.device;
        sam.model = data.model || MODEL_ID;
      }
      if (data.id && sam.pending.has(data.id)) {
        const pending = sam.pending.get(data.id);
        if (pending.worker !== worker) return;
        sam.pending.delete(data.id);
        clearTimeout(pending.timer);
        data.error ? pending.reject(new Error(data.error)) : pending.resolve(data);
      }
    });
    worker.addEventListener("error", event => {
      resetWorker(worker, event.error || new Error(event.message || "SAM2.1 worker failed"));
    });
    worker.addEventListener("messageerror", () => {
      resetWorker(worker, new Error("SAM2.1 worker message decoding failed"));
    });
    return worker;
  }

  function request(type, payload = {}, transfer = []) {
    const sam = runtime.sam;
    const worker = ensureWorker();
    const id = `sam15-${Date.now()}-${++sam.requestSeq}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (!sam.pending.has(id)) return;
        resetWorker(worker, new Error(`SAM2.1 worker request timed out: ${type}`));
      }, REQUEST_TIMEOUT_MS);
      sam.pending.set(id, { resolve, reject, worker, timer });
      try {
        worker.postMessage({ id, type, ...payload }, transfer);
      } catch (error) {
        clearTimeout(timer);
        sam.pending.delete(id);
        resetWorker(worker, error);
      }
    });
  }

  async function ensureImageEncoded(context) {
    const original = context.imageFile;
    if (!original) throw new Error(text("请先打开图片。", "Open an image first."));
    const input = context.previewBlob || original;
    const key = `${original.name}:${original.size}:${original.lastModified}`;
    if (runtime.sam.imageKey === key && runtime.sam.encodePromise) return runtime.sam.encodePromise;

    const buffer = await input.arrayBuffer();
    if (!context.isCurrent()) throw new Error("SAM2.1 image session changed");
    runtime.sam.imageKey = key;
    runtime.sam.encodePromise = request("encode", {
      buffer,
      mime: input.type || "application/octet-stream",
      name: original.name,
    }, [buffer]).catch(error => {
      if (runtime.sam.imageKey === key) {
        runtime.sam.imageKey = null;
        runtime.sam.encodePromise = null;
      }
      throw error;
    });
    return runtime.sam.encodePromise;
  }

  function pointPrompts(points, labels, width, height) {
    return points.map((point, index) => ({
      x: point[0] / Math.max(1, width),
      y: point[1] / Math.max(1, height),
      label: Number(labels[index] ?? 1),
    }));
  }

  function boxPrompt(box, width, height) {
    if (!box) return null;
    const [x1, y1, x2, y2] = box;
    return {
      x1: x1 / Math.max(1, width),
      y1: y1 / Math.max(1, height),
      x2: x2 / Math.max(1, width),
      y2: y2 / Math.max(1, height),
    };
  }

  function preferredAnchor(points, labels, box) {
    for (let i = 0; i < points.length; i++) {
      if (Number(labels[i] ?? 1) === 1) return points[i];
    }
    if (box) {
      const [x1, y1, x2, y2] = box;
      return [(x1 + x2) / 2, (y1 + y2) / 2];
    }
    return null;
  }

  runSamPrediction = async function() {
    if (!state.imageFile || (state.sam.points.length === 0 && !state.sam.box)) {
      state.sam.preview = null;
      renderSamOverlay();
      return;
    }

    const imageFile = state.imageFile;
    const imageName = state.imageName;
    const dataRef = state.data;
    const samRef = state.sam;
    const previewBlob = state.previewBlob;
    const width = state.width;
    const height = state.height;
    const points = samRef.points.map(point => [...point]);
    const labels = [...samRef.labels];
    const box = samRef.box ? [...samRef.box] : null;
    const interactionSeq = ++runtime.sam.interactionSeq;
    const isCurrent = () => (
      state.imageFile === imageFile &&
      state.imageName === imageName &&
      state.data === dataRef &&
      state.sam === samRef &&
      runtime.sam.interactionSeq === interactionSeq
    );
    const context = { imageFile, previewBlob, isCurrent };

    setBusy(true, text("浏览器本地 SAM2.1 Tiny 推理中...", "Running SAM2.1 Tiny locally in the browser..."));
    try {
      await ensureImageEncoded(context);
      if (!isCurrent()) return;
      const result = await request("decode", {
        prompts: pointPrompts(points, labels, width, height),
        box: boxPrompt(box, width, height),
      });
      if (!isCurrent()) return;

      const outputType = els.samOutputSelect.value;
      const geometryPoints = geometry.geometryFromMask(
        new Uint8Array(result.mask),
        Number(result.width),
        Number(result.height),
        outputType,
        { anchor: preferredAnchor(points, labels, box) }
      );
      if (!isCurrent()) return;
      samRef.preview = {
        label: "",
        points: geometryPoints,
        shape_type: outputType,
        group_id: null,
        description: "",
        flags: {},
        mask: null,
        _score: Number(result.score || 0),
        _model: `browser:${MODEL_ID}`,
      };
      renderSamOverlay();
      setStatus(text(
        `浏览器 AI 候选已更新，score ${Number(result.score || 0).toFixed(3)}。Enter 接受。`,
        `Browser AI candidate updated, score ${Number(result.score || 0).toFixed(3)}. Press Enter to accept.`
      ));
    } catch (error) {
      if (isCurrent()) {
        samRef.preview = null;
        renderSamOverlay();
        const message = error?.message || String(error);
        setStatus(message, true);
        alert(text(`浏览器 SAM2.1 推理失败：${message}`, `Browser SAM2.1 failed: ${message}`));
      }
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  runtime.sam.model = MODEL_ID;
  runtime.sam.request = request;
  runtime.sam.ensureImageEncoded = ensureImageEncoded;
})();
