"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  if (!runtime) return;

  const isEnglish = () => state?.language === "en";
  const text = (zh, en) => isEnglish() ? en : zh;

  // v1.5 intentionally ships only browser-native AI paths that are ready for the
  // static runtime. Keep legacy server-only choices visible as disabled context
  // rather than allowing a click to fall back to an upload API.
  const worldOption = els.yoloModelSelect?.querySelector('option[value="yolo-world"]');
  if (worldOption) {
    worldOption.disabled = true;
    worldOption.textContent = "YOLO-World (v1.5 pending)";
    worldOption.title = text("v1.5 纯浏览器版暂未迁移 YOLO-World", "YOLO-World is not migrated to the v1.5 browser runtime yet");
    if (els.yoloModelSelect.value === "yolo-world") els.yoloModelSelect.value = "yolo11-detect";
  }

  const previousInstall = installAIFromMenu;
  installAIFromMenu = async function() {
    await previousInstall();
    const detectReady = runtime.yolo?.devices?.has?.("yolo11-detect");
    const segReady = runtime.yolo?.devices?.has?.("yolo11-seg");
    const samReady = !!runtime.sam?.loaded;
    if (detectReady && segReady && samReady) {
      setStatus(text("浏览器 AI 已下载并初始化完成。", "Browser AI models are downloaded and initialized."));
      return;
    }
    const missing = [];
    if (!detectReady) missing.push("YOLO11 Detect");
    if (!segReady) missing.push("YOLO11 Seg");
    if (!samReady) missing.push("SlimSAM");
    setStatus(text(`部分浏览器 AI 未能初始化：${missing.join("、")}`, `Some browser AI components could not initialize: ${missing.join(", ")}`), true);
  };

  showModelStatus = async function() {
    let cacheNames = [];
    try { if ("caches" in window) cacheNames = await caches.keys(); } catch {}
    const detectDevice = runtime.yolo?.devices?.get?.("yolo11-detect") || null;
    const segDevice = runtime.yolo?.devices?.get?.("yolo11-seg") || null;
    const rows = [
      ["Runtime", "Browser-only 1.5.0"],
      ["WebGPU", runtime.webgpu ? text("可用", "available") : text("不可用，将使用 CPU/WASM 兼容路径", "unavailable; CPU/WASM fallback")],
      ["SlimSAM", runtime.sam?.loaded ? `${text("已加载", "loaded")} (${runtime.sam.device || "local"})` : text("未加载", "not loaded")],
      ["YOLO11 Detect", detectDevice ? `${text("已加载", "loaded")} (${detectDevice})` : text("未加载", "not loaded")],
      ["YOLO11 Seg", segDevice ? `${text("已加载", "loaded")} (${segDevice})` : text("未加载", "not loaded")],
      ["YOLO-World", text("v1.5 暂未迁移", "not migrated in v1.5")],
      [text("模型缓存", "Model cache"), cacheNames.length ? cacheNames.join(", ") : text("尚无 Cache Storage 缓存", "no Cache Storage entries yet")],
      [text("图片上传", "Image upload"), text("已禁用：图片仅在本机读取", "disabled: images stay local")],
      [text("服务端 API", "Server API"), text("无", "none")],
    ];
    await showModal({
      title: t("aiModelStatus"),
      body: `<table class="model-table"><tbody>${rows.map(([a,b]) => `<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`).join("")}</tbody></table><p class="muted">${escapeHtml(text("模型首次使用时下载并缓存到当前浏览器；推理不经过 HelloLabel 服务器。", "Models download on first use and are cached in this browser; inference never goes through a HelloLabel server."))}</p>`,
      buttons: [{ label: t("close"), value: "ok", className: "primary" }]
    });
  };

  if (typeof I18N !== "undefined") {
    if (I18N.zh) {
      I18N.zh.samInfo = "SlimSAM 浏览器本地推理：左键点=正样本，右键点=负样本；左键拖动=Box Prompt；Enter 接受，Esc 取消，Backspace 撤销最后一个提示。";
      I18N.zh.yoloInfo = "YOLO11 Detect / Seg 在当前浏览器本地运行，优先 WebGPU，必要时回退 CPU/WASM；原图不会上传到 HelloLabel 服务器。";
    }
    if (I18N.en) {
      I18N.en.samInfo = "Browser-local SlimSAM: left click = positive point, right click = negative point, left-drag = Box Prompt, Enter accepts, Esc cancels, Backspace removes the last prompt.";
      I18N.en.yoloInfo = "YOLO11 Detect / Seg run locally in this browser, preferring WebGPU with CPU/WASM fallback. Source images are never uploaded to a HelloLabel server.";
    }
    try { applyLanguage(state.language, false); } catch {}
  }

  try { updateYoloUi(); } catch {}
})();
