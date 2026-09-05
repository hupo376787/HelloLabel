"use strict";

(() => {
  if (window.__helloLabelAnnotationTelemetryInstalled) return;
  window.__helloLabelAnnotationTelemetryInstalled = true;

  const TOOL_BY_BUTTON = {
    penBtn: "pen",
    polygonBtn: "polygon",
    rectBtn: "rectangle",
    obbBtn: "oriented_rectangle",
    circleBtn: "circle",
    pointBtn: "point",
    lineBtn: "line",
    linestripBtn: "linestrip",
  };

  function countInstances() {
    const el = document.getElementById("instanceCount");
    const value = Number.parseInt(el?.textContent || "0", 10);
    return Number.isFinite(value) ? value : 0;
  }

  function activeManualTool(fallback) {
    for (const [id, tool] of Object.entries(TOOL_BY_BUTTON)) {
      if (document.getElementById(id)?.classList.contains("active")) return tool;
    }
    return fallback || "unknown";
  }

  function track(detail) {
    const api = window.helloLabelTelemetry;
    if (!api?.enabled || typeof api.trackAnnotationCreate !== "function") return;
    api.trackAnnotationCreate(detail);
  }

  function installCommitGeometryWrapper() {
    if (typeof window.commitGeometry !== "function") return;
    if (window.commitGeometry.__helloLabelTelemetryWrapped) return;

    const original = window.commitGeometry;
    const wrapped = async function(type, points, meta = { source: "manual" }) {
      const before = countInstances();
      const source = String(meta?.source || "manual");
      const tool = source !== "manual" ? "sam" : activeManualTool(type);
      const result = await original.apply(this, arguments);
      const created = Math.max(0, countInstances() - before);
      if (created > 0) {
        track({
          tool,
          shape_type: String(type || "unknown"),
          source,
          count: created,
        });
      }
      return result;
    };
    Object.defineProperty(wrapped, "__helloLabelTelemetryWrapped", { value: true });
    window.commitGeometry = wrapped;
  }

  function installYoloObserver() {
    const button = document.getElementById("yoloRunBtn");
    if (!button || button.dataset.annotationTelemetryBound === "1") return;
    button.dataset.annotationTelemetryBound = "1";

    button.addEventListener("click", () => {
      if (button.disabled) return;
      const before = countInstances();
      const modelSelect = document.getElementById("yoloModelSelect");
      const outputSelect = document.getElementById("yoloOutputSelect");
      const model = String(modelSelect?.value || "yolo");
      const shapeType = model === "yolo11-seg"
        ? String(outputSelect?.value || "polygon")
        : "rectangle";
      const started = Date.now();
      let lastCount = before;

      const timer = setInterval(() => {
        const current = countInstances();
        if (current > lastCount) lastCount = current;
        const created = Math.max(0, lastCount - before);
        if (created > 0) {
          clearInterval(timer);
          track({
            tool: model,
            shape_type: shapeType,
            source: model,
            count: created,
          });
          return;
        }
        if (Date.now() - started > 30000) clearInterval(timer);
      }, 250);
    }, { capture: true });
  }

  function install() {
    installCommitGeometryWrapper();
    installYoloObserver();
  }

  window.addEventListener("hellolabel:ready", install, { once: true });
})();
