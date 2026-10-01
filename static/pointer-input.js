"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  if (!viewport || window.helloLabelPointerInput) return;

  const PROFILES = Object.freeze({
    mouse: Object.freeze({
      pointerType: "mouse",
      shapeHitPx: 8,
      vertexHitPx: 10,
      edgeHitPx: 9,
      polygonStartHitPx: 12,
      allowHover: true,
    }),
    pen: Object.freeze({
      pointerType: "pen",
      shapeHitPx: 10,
      vertexHitPx: 12,
      edgeHitPx: 11,
      polygonStartHitPx: 14,
      allowHover: true,
    }),
    touch: Object.freeze({
      pointerType: "touch",
      shapeHitPx: 18,
      vertexHitPx: 22,
      edgeHitPx: 18,
      polygonStartHitPx: 24,
      allowHover: false,
    }),
  });

  let lastPointerType = "mouse";

  function normalizePointerType(value) {
    const type = String(value || "").toLowerCase();
    return type === "touch" || type === "pen" ? type : "mouse";
  }

  function profileFor(pointerType = lastPointerType) {
    return PROFILES[normalizePointerType(pointerType)] || PROFILES.mouse;
  }

  function rememberPointer(event) {
    lastPointerType = normalizePointerType(event?.pointerType);
  }

  viewport.addEventListener("pointerdown", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointermove", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointerup", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointercancel", rememberPointer, { capture: true, passive: true });

  window.helloLabelPointerInput = {
    profiles: PROFILES,
    profileFor,
    normalizePointerType,
    get lastPointerType() {
      return lastPointerType;
    },
  };
})();
