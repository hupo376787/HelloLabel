"use strict";

(() => {
  const RUNTIME_VERSION = "2.1.0";
  const TIFF_EXTENSIONS = new Set([".tif", ".tiff"]);
  const TIFF_DECODER_URL = "https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js";

  const runtime = {
    version: RUNTIME_VERSION,
    mode: "browser-only",
    secureContext: window.isSecureContext === true,
    crossOriginIsolated: window.crossOriginIsolated === true,
    fileSystemAccess: "showDirectoryPicker" in window || "showOpenFilePicker" in window,
    webgpu: !!navigator.gpu,
    tiffReady: false,
    sam: {
      worker: null,
      ready: false,
      imageKey: null,
      encodePromise: null,
      requestSeq: 0,
      interactionSeq: 0,
      pending: new Map(),
      loaded: false,
      device: null,
      model: null,
    },
    yolo: {
      module: null,
      models: new Map(),
      devices: new Map(),
    },
  };

  window.helloLabelBrowserRuntime = runtime;

  function english() {
    return state?.language === "en";
  }

  function message(zh, en) {
    return english() ? en : zh;
  }

  function extOf(name) {
    const value = String(name || "");
    const dot = value.lastIndexOf(".");
    return dot >= 0 ? value.slice(dot).toLowerCase() : "";
  }

  async function loadClassicScript(url, marker) {
    if (marker && window[marker]) return;

    const existing = [...document.scripts].find(script => script.src === url);
    if (existing) {
      if (marker && window[marker]) return;
      await new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      });
      return;
    }

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function imageFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return { img, url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function decodeTiffLocally(file) {
    await loadClassicScript(TIFF_DECODER_URL, "UTIF");
    if (!window.UTIF) throw new Error("UTIF decoder unavailable");

    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds?.length) throw new Error(message("无法读取 TIFF 图像。", "Unable to decode TIFF image."));

    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const width = Number(ifds[0].width || 0);
    const height = Number(ifds[0].height || 0);
    if (!width || !height) throw new Error(message("TIFF 图像尺寸无效。", "Invalid TIFF dimensions."));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) throw new Error(message("无法创建图像画布。", "Unable to create the image canvas."));
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        value => value ? resolve(value) : reject(new Error("TIFF conversion failed")),
        "image/png",
        0.96,
      );
    });
    runtime.tiffReady = true;
    return { blob, width, height };
  }

  function resetBrowserSamImage() {
    runtime.sam.interactionSeq++;
    runtime.sam.imageKey = null;
    runtime.sam.encodePromise = null;
    if (runtime.sam.worker) {
      try { runtime.sam.worker.postMessage({ type: "reset" }); } catch {}
    }
  }

  loadPreview = async function(file) {
    if (!file) throw new Error(message("没有可读取的图片文件。", "No image file was provided."));

    const isTiff = TIFF_EXTENSIONS.has(extOf(file.name));
    let previewBlob = file;
    let width = 0;
    let height = 0;

    if (isTiff) {
      const decoded = await decodeTiffLocally(file);
      previewBlob = decoded.blob;
      width = decoded.width;
      height = decoded.height;
    }

    if (state.previewUrl) {
      try { URL.revokeObjectURL(state.previewUrl); } catch {}
      state.previewUrl = null;
    }

    const { img, url } = await imageFromBlob(previewBlob);
    state.previewUrl = url;
    state.previewBlob = previewBlob;
    state.aiImageToken = null;
    state.width = width || img.naturalWidth || img.width;
    state.height = height || img.naturalHeight || img.height;

    els.imageView.src = url;
    try { await els.imageView.decode(); } catch {}
    els.stage.style.width = `${state.width}px`;
    els.stage.style.height = `${state.height}px`;
    resizeOverlay();
    resetBrowserSamImage();
  };
})();
