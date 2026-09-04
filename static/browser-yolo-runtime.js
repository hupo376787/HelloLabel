"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  const geometry = window.helloLabelMaskGeometry;
  if (!runtime?.yolo || !geometry) return;

  const ULTRALYTICS_URL = "https://esm.sh/@ultralytics/yolo@0.0.41";
  const MODEL_URLS = {
    "yolo11-detect": "https://huggingface.co/webnn/yolo11n/resolve/main/onnx/yolo11n.onnx?download=true",
    "yolo11-seg": "https://huggingface.co/MikeLud/ObjectDetectionYOLO11-ONNX/resolve/main/yolo11n-seg.onnx?download=true",
  };
  const text = (zh, en) => state?.language === "en" ? en : zh;

  async function loadModule() {
    if (!runtime.yolo.module) {
      const promise = import(ULTRALYTICS_URL);
      runtime.yolo.module = promise;
      try {
        return await promise;
      } catch (error) {
        if (runtime.yolo.module === promise) runtime.yolo.module = null;
        throw error;
      }
    }
    return runtime.yolo.module;
  }

  async function loadModel(modelId) {
    if (runtime.yolo.models.has(modelId)) return runtime.yolo.models.get(modelId);
    const url = MODEL_URLS[modelId];
    if (!url) throw new Error(text("当前纯浏览器版本不支持该模型。", "This model is not supported by the browser-only runtime."));
    const promise = (async () => {
      const { YOLO } = await loadModule();
      const model = await YOLO.load(url, { device: "auto" });
      runtime.yolo.devices.set(modelId, model.device || "auto");
      return model;
    })();
    runtime.yolo.models.set(modelId, promise);
    try {
      return await promise;
    } catch (error) {
      runtime.yolo.models.delete(modelId);
      runtime.yolo.devices.delete(modelId);
      throw error;
    }
  }

  function parseColor(value) {
    if (Array.isArray(value) && value.length >= 3) return value.slice(0, 3).map(Number);
    if (typeof value === "string") {
      const hex = value.match(/^#?([0-9a-f]{6})$/i)?.[1];
      if (hex) return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
      const nums = value.match(/\d+(?:\.\d+)?/g)?.map(Number);
      if (nums?.length >= 3) return nums.slice(0, 3);
    }
    return null;
  }

  function detectionBounds(box, width, height) {
    const x1 = Math.max(0, Math.min(width - 1, Math.floor(Number(box.x1) || 0)));
    const y1 = Math.max(0, Math.min(height - 1, Math.floor(Number(box.y1) || 0)));
    const x2 = Math.max(x1, Math.min(width - 1, Math.ceil(Number(box.x2) || 0)));
    const y2 = Math.max(y1, Math.min(height - 1, Math.ceil(Number(box.y2) || 0)));
    return { x1, y1, x2, y2 };
  }

  function maskForDetection(results, box, fallbackWidth, fallbackHeight) {
    const rgba = results?.masks;
    const width = Number(results?.width || fallbackWidth);
    const height = Number(results?.height || fallbackHeight);
    if (!(rgba instanceof Uint8Array) || rgba.length < width * height * 4) return null;
    const bounds = detectionBounds(box, width, height);
    const color = parseColor(box.color);
    const mask = new Uint8Array(width * height);
    let hits = 0;

    for (let y = bounds.y1; y <= bounds.y2; y++) {
      for (let x = bounds.x1; x <= bounds.x2; x++) {
        const p = (y * width + x) * 4;
        if (rgba[p + 3] === 0) continue;
        let match = true;
        if (color) {
          const dr = rgba[p] - color[0], dg = rgba[p + 1] - color[1], db = rgba[p + 2] - color[2];
          match = Math.sqrt(dr * dr + dg * dg + db * db) <= 48;
        }
        if (!match) continue;
        mask[y * width + x] = 1;
        hits++;
      }
    }
    if (!hits) return null;
    return {
      mask,
      width,
      height,
      anchor: [(bounds.x1 + bounds.x2) / 2, (bounds.y1 + bounds.y2) / 2],
      bounds,
    };
  }

  function fallbackGeometry(box, outputType) {
    const x1 = Number(box.x1), y1 = Number(box.y1), x2 = Number(box.x2), y2 = Number(box.y2);
    if (outputType === "rectangle") return { type: "rectangle", points: [[x1, y1], [x2, y2]] };
    if (outputType === "circle") {
      const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2, r = Math.hypot(x2 - x1, y2 - y1) / 2;
      return { type: "circle", points: [[cx, cy], [cx + r, cy]] };
    }
    const corners = [[x1, y1], [x2, y1], [x2, y2], [x1, y2]];
    return { type: outputType === "oriented_rectangle" ? "oriented_rectangle" : "polygon", points: corners };
  }

  function parseRequestedClasses() {
    return new Set(String(els.yoloTextInput.value || "")
      .replace(/，/g, ",")
      .split(",")
      .map(value => value.trim().toLowerCase())
      .filter(Boolean));
  }

  runYolo = async function() {
    if (!state.imageFile || !state.data) return;
    const modelId = els.yoloModelSelect.value;
    if (modelId === "yolo-world") {
      alert(text("YOLO-World 尚未迁移到 v1.5 纯浏览器运行时。", "YOLO-World has not yet been migrated to the v1.5 browser runtime."));
      return;
    }

    const imageFile = state.imageFile;
    const imageName = state.imageName;
    const dataRef = state.data;
    const previewBlob = state.previewBlob;
    const width = state.width;
    const height = state.height;
    const isCurrent = () => state.imageFile === imageFile && state.imageName === imageName && state.data === dataRef;

    setBusy(true, text("浏览器本地 YOLO 推理中...", "Running YOLO locally in the browser..."));
    try {
      const model = await loadModel(modelId);
      if (!isCurrent()) return;
      const conf = Math.max(0.001, Math.min(1, Number(els.yoloConf.value || 0.25)));
      const iou = Math.max(0.001, Math.min(1, Number(els.yoloIou.value || 0.5)));
      const results = await model.predict(previewBlob || imageFile, { conf, iou });
      if (!isCurrent()) return;

      let boxes = Array.isArray(results?.boxes) ? results.boxes : [];
      const requested = parseRequestedClasses();
      if (requested.size) boxes = boxes.filter(item => requested.has(String(item.name ?? item.cls ?? "").toLowerCase()));
      if (!boxes.length) {
        setStatus(t("noDetections"));
        return;
      }

      const additions = [];
      const requestedType = modelId === "yolo11-seg" ? els.yoloOutputSelect.value : "rectangle";
      for (const item of boxes) {
        const label = String(item.name ?? item.cls ?? "object");
        let shape;
        if (modelId === "yolo11-seg" && requestedType !== "rectangle") {
          const isolated = maskForDetection(results, item, width, height);
          if (isolated) {
            try {
              shape = {
                type: requestedType,
                points: geometry.geometryFromMask(isolated.mask, isolated.width, isolated.height, requestedType, { anchor: isolated.anchor }),
              };
            } catch (error) {
              console.warn("HelloLabel YOLO mask-to-geometry fallback", error);
            }
          }
        }
        if (!shape) shape = fallbackGeometry(item, requestedType);
        additions.push({ label, shape, score: Number(item.conf ?? 0) });
      }

      if (!isCurrent()) return;
      if (!additions.length) {
        setStatus(t("noDetections"));
        return;
      }

      pushHistory();
      for (const addition of additions) {
        if (!dataRef.hellolabel.labels[addition.label]) dataRef.hellolabel.labels[addition.label] = { color: stableColor(addition.label) };
        const id = uid();
        dataRef.shapes.push(makeShape(addition.label, addition.shape.type, addition.shape.points));
        state.runtimeIds.push(id);
        state.runtimeMeta[id] = { source: `browser:${modelId}`, score: addition.score };
      }
      markDirty(t("aiAdded", { count: additions.length }));
      renderAll();
      if (additions.length === 1) selectId(shapeIds().at(-1), { scroll: true, ensure: true });
      setStatus(text(`浏览器本地 AI 已新增 ${additions.length} 个实例。`, `Browser AI added ${additions.length} instance(s).`));
    } catch (error) {
      if (!isCurrent()) return;
      const message = error?.message || String(error);
      setStatus(message, true);
      alert(text(`浏览器 YOLO 推理失败：${message}`, `Browser YOLO failed: ${message}`));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  runtime.yolo.loadModel = loadModel;
})();
