"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  const geometry = window.helloLabelMaskGeometry;
  if (!runtime?.sam || !geometry) return;

  const text = (zh, en) => state?.language === "en" ? en : zh;

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
      }
      if (data.id && sam.pending.has(data.id)) {
        const pending = sam.pending.get(data.id);
        sam.pending.delete(data.id);
        data.error ? pending.reject(new Error(data.error)) : pending.resolve(data);
      }
    });
    worker.addEventListener("error", event => {
      const error = event.error || new Error(event.message || "SlimSAM worker failed");
      for (const pending of sam.pending.values()) pending.reject(error);
      sam.pending.clear();
    });
    return worker;
  }

  function request(type, payload = {}, transfer = []) {
    const sam = runtime.sam;
    const worker = ensureWorker();
    const id = `sam15-${Date.now()}-${++sam.requestSeq}`;
    return new Promise((resolve, reject) => {
      sam.pending.set(id, { resolve, reject });
      worker.postMessage({ id, type, ...payload }, transfer);
    });
  }

  async function ensureImageEncoded() {
    if (!state.imageFile) throw new Error(text("请先打开图片。", "Open an image first."));
    const original = state.imageFile;
    const input = state.previewBlob || original;
    const key = `${original.name}:${original.size}:${original.lastModified}`;
    if (runtime.sam.imageKey === key && runtime.sam.encodePromise) return runtime.sam.encodePromise;

    const buffer = await input.arrayBuffer();
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

  function pointPrompts() {
    return state.sam.points.map((point, index) => ({
      x: point[0] / Math.max(1, state.width),
      y: point[1] / Math.max(1, state.height),
      label: Number(state.sam.labels[index] ?? 1),
    }));
  }

  function boxPrompt() {
    if (!state.sam.box) return null;
    const [x1, y1, x2, y2] = state.sam.box;
    return {
      x1: x1 / Math.max(1, state.width),
      y1: y1 / Math.max(1, state.height),
      x2: x2 / Math.max(1, state.width),
      y2: y2 / Math.max(1, state.height),
    };
  }

  function preferredAnchor() {
    for (let i = 0; i < state.sam.points.length; i++) {
      if (Number(state.sam.labels[i] ?? 1) === 1) return state.sam.points[i];
    }
    if (state.sam.box) {
      const [x1, y1, x2, y2] = state.sam.box;
      return [(x1 + x2) / 2, (y1 + y2) / 2];
    }
    return null;
  }

  // Replace the legacy HTTP SAM path. Point prompts and true input_boxes are sent
  // only to the local worker; the image embedding is cached per image on-device.
  runSamPrediction = async function() {
    if (!state.imageFile || (state.sam.points.length === 0 && !state.sam.box)) {
      state.sam.preview = null;
      renderSamOverlay();
      return;
    }

    const interactionSeq = ++state.sam.requestSeq;
    setBusy(true, text("浏览器本地 SlimSAM 推理中...", "Running SlimSAM locally in the browser..."));
    try {
      await ensureImageEncoded();
      const result = await request("decode", {
        prompts: pointPrompts(),
        box: boxPrompt(),
      });
      if (interactionSeq !== state.sam.requestSeq) return;

      const outputType = els.samOutputSelect.value;
      const points = geometry.geometryFromMask(
        new Uint8Array(result.mask),
        Number(result.width),
        Number(result.height),
        outputType,
        { anchor: preferredAnchor() }
      );
      state.sam.preview = {
        label: "",
        points,
        shape_type: outputType,
        group_id: null,
        description: "",
        flags: {},
        mask: null,
        _score: Number(result.score || 0),
        _model: `browser:Xenova/slimsam-77-uniform`,
      };
      renderSamOverlay();
      setStatus(text(
        `浏览器 AI 候选已更新，score ${Number(result.score || 0).toFixed(3)}。Enter 接受。`,
        `Browser AI candidate updated, score ${Number(result.score || 0).toFixed(3)}. Press Enter to accept.`
      ));
    } catch (error) {
      if (interactionSeq === state.sam.requestSeq) {
        state.sam.preview = null;
        renderSamOverlay();
        const message = error?.message || String(error);
        setStatus(message, true);
        alert(text(`浏览器 SlimSAM 推理失败：${message}`, `Browser SlimSAM failed: ${message}`));
      }
    } finally {
      if (interactionSeq === state.sam.requestSeq) setBusy(false);
    }
  };

  runtime.sam.request = request;
  runtime.sam.ensureImageEncoded = ensureImageEncoded;
})();
