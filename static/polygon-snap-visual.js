"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  const drawingStart = document.getElementById("drawingStart");
  if (!viewport || !drawingStart) return;

  const DEFAULT_RADIUS = 5;
  const SNAP_RADIUS = 12;
  let snapped = false;

  drawingStart.style.transition = "r 110ms ease, fill 110ms ease, stroke-width 110ms ease, opacity 110ms ease";

  function setSnapped(next) {
    next = !!next;
    if (snapped === next) return;
    snapped = next;
    drawingStart.setAttribute("r", String(next ? SNAP_RADIUS : DEFAULT_RADIUS));
    drawingStart.style.fill = next ? "color-mix(in srgb, var(--accent) 20%, #fff)" : "";
    drawingStart.style.strokeWidth = next ? "2.5" : "";
  }

  function update(clientX, clientY) {
    const drawing = state?.drawing;
    if (!drawing || drawing.type !== "polygon" || !Array.isArray(drawing.points) || drawing.points.length < 3) {
      setSnapped(false);
      return;
    }

    const first = drawing.points[0];
    const point = clampImagePoint(screenToImage(clientX, clientY));
    const distancePx = Math.hypot(point[0] - first[0], point[1] - first[1]) * state.scale;
    setSnapped(distancePx <= SNAP_RADIUS);
  }

  viewport.addEventListener("pointermove", event => update(event.clientX, event.clientY), { passive: true });
  viewport.addEventListener("pointerleave", () => setSnapped(false), { passive: true });
  viewport.addEventListener("pointerdown", event => {
    if (event.button === 0 && snapped) requestAnimationFrame(() => setSnapped(false));
  }, { passive: true });
  viewport.addEventListener("wheel", () => setSnapped(false), { passive: true });

  window.addEventListener("keydown", event => {
    if (event.key === "Escape") setSnapped(false);
  }, true);

  if (typeof setMode === "function") {
    const originalSetMode = setMode;
    setMode = function(...args) {
      const result = originalSetMode(...args);
      if (state.mode !== "polygon") setSnapped(false);
      return result;
    };
  }
})();
