"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  const interactionSvg = document.getElementById("interactionSvg");
  if (!viewport || !interactionSvg) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const group = document.createElementNS(SVG_NS, "g");
  group.id = "rectangleCrosshair";
  group.classList.add("hidden-svg");
  group.setAttribute("aria-hidden", "true");
  group.setAttribute("pointer-events", "none");

  const horizontal = document.createElementNS(SVG_NS, "line");
  const vertical = document.createElementNS(SVG_NS, "line");
  for (const line of [horizontal, vertical]) {
    line.setAttribute("stroke", "var(--selection)");
    line.setAttribute("stroke-width", "1.15");
    line.setAttribute("stroke-opacity", "0.82");
    line.setAttribute("stroke-dasharray", "5 4");
    line.setAttribute("vector-effect", "non-scaling-stroke");
    line.setAttribute("shape-rendering", "geometricPrecision");
  }

  group.append(horizontal, vertical);

  // Keep the alignment guides below selection handles and drawing geometry so
  // they remain useful without obscuring the rectangle being created.
  const drawingPath = document.getElementById("drawingPath");
  if (drawingPath?.parentNode === interactionSvg) interactionSvg.insertBefore(group, drawingPath);
  else interactionSvg.appendChild(group);

  let lastClientX = null;
  let lastClientY = null;

  function hideCrosshair() {
    group.classList.add("hidden-svg");
  }

  function imageBoundsInViewport() {
    const scale = Number(state?.scale || 0);
    const width = Number(state?.width || 0);
    const height = Number(state?.height || 0);
    if (!(scale > 0) || !(width > 0) || !(height > 0)) return null;

    const x0 = Number(state.panX || 0);
    const y0 = Number(state.panY || 0);
    const x1 = x0 + width * scale;
    const y1 = y0 + height * scale;
    return {
      left: Math.min(x0, x1),
      right: Math.max(x0, x1),
      top: Math.min(y0, y1),
      bottom: Math.max(y0, y1)
    };
  }

  function updateCrosshair(clientX = lastClientX, clientY = lastClientY) {
    lastClientX = clientX;
    lastClientY = clientY;

    if (clientX == null || clientY == null || !state?.data || state.mode !== "rectangle" || state.panning) {
      hideCrosshair();
      return;
    }

    const viewportRect = viewport.getBoundingClientRect();
    const x = Number(clientX) - viewportRect.left;
    const y = Number(clientY) - viewportRect.top;
    const bounds = imageBoundsInViewport();
    if (!bounds || x < bounds.left || x > bounds.right || y < bounds.top || y > bounds.bottom) {
      hideCrosshair();
      return;
    }

    horizontal.setAttribute("x1", String(bounds.left));
    horizontal.setAttribute("x2", String(bounds.right));
    horizontal.setAttribute("y1", String(y));
    horizontal.setAttribute("y2", String(y));

    vertical.setAttribute("x1", String(x));
    vertical.setAttribute("x2", String(x));
    vertical.setAttribute("y1", String(bounds.top));
    vertical.setAttribute("y2", String(bounds.bottom));

    group.classList.remove("hidden-svg");
  }

  viewport.addEventListener("pointermove", event => {
    updateCrosshair(event.clientX, event.clientY);
  }, { passive: true });

  viewport.addEventListener("pointerleave", () => {
    lastClientX = null;
    lastClientY = null;
    hideCrosshair();
  }, { passive: true });

  // Zooming or resizing changes the displayed image edges even when the mouse
  // itself is stationary, so refresh the guide against the latest pointer.
  viewport.addEventListener("wheel", () => {
    requestAnimationFrame(() => updateCrosshair());
  }, { passive: true });

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => requestAnimationFrame(() => updateCrosshair()));
    observer.observe(viewport);
  }

  // Tool changes can happen from toolbar clicks or keyboard shortcuts while the
  // pointer is stationary. Hide/show the guide immediately instead of waiting for
  // the next pointermove event.
  if (typeof setMode === "function") {
    const originalSetMode = setMode;
    setMode = function(...args) {
      const result = originalSetMode(...args);
      requestAnimationFrame(() => updateCrosshair());
      return result;
    };
  }
})();
