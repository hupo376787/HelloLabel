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
  const activePointers = new Map();

  function normalizePointerType(value) {
    const type = String(value || "").toLowerCase();
    return type === "touch" || type === "pen" ? type : "mouse";
  }

  function profileFor(pointerType = lastPointerType) {
    return PROFILES[normalizePointerType(pointerType)] || PROFILES.mouse;
  }

  function pointerSnapshot(event) {
    return {
      pointerId: event.pointerId,
      pointerType: normalizePointerType(event.pointerType),
      clientX: Number(event.clientX || 0),
      clientY: Number(event.clientY || 0),
      buttons: Number(event.buttons || 0),
      isPrimary: event.isPrimary !== false,
    };
  }

  function rememberPointer(event) {
    lastPointerType = normalizePointerType(event?.pointerType);
    if (event?.pointerId == null) return;
    if (event.type === "pointerup" || event.type === "pointercancel") activePointers.delete(event.pointerId);
    else activePointers.set(event.pointerId, pointerSnapshot(event));
  }

  function capture(event) {
    if (!event || event.pointerId == null) return false;
    try {
      viewport.setPointerCapture?.(event.pointerId);
      return viewport.hasPointerCapture?.(event.pointerId) ?? true;
    } catch {
      return false;
    }
  }

  function release(pointerId) {
    if (pointerId == null) return false;
    try {
      if (!viewport.hasPointerCapture?.(pointerId)) return false;
      viewport.releasePointerCapture?.(pointerId);
      return true;
    } catch {
      return false;
    }
  }

  viewport.addEventListener("pointerdown", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointermove", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointerup", rememberPointer, { capture: true, passive: true });
  viewport.addEventListener("pointercancel", rememberPointer, { capture: true, passive: true });

  window.helloLabelPointerInput = {
    profiles: PROFILES,
    profileFor,
    normalizePointerType,
    capture,
    release,
    activePointers,
    get activePointerCount() {
      return activePointers.size;
    },
    get lastPointerType() {
      return lastPointerType;
    },
  };
})();
