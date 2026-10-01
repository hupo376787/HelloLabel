"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function notify(mode, pointCount, phase = "drawing") {
    if (mode === "polygon") {
      window.HelloLabelDrawingState?.polygon?.(pointCount, phase);
      return;
    }
    if (mode === "linestrip") {
      window.notifyMobileToolbarState?.({ tool: "polyline", phase, pointCount });
    }
  }

  function pointerDown(point, mode) {
    if (!context || (mode !== "polygon" && mode !== "linestrip")) return false;
    const { state, renderDrawingOverlay, setStatus, t, shapeTypeText } = context;
    if (!state.drawing) state.drawing = { type: mode, points: [point], cursor: point };
    else {
      state.drawing.points.push(point);
      state.drawing.cursor = point;
    }
    renderDrawingOverlay();
    setStatus(t("sequenceHint", { type: shapeTypeText(mode) }));
    notify(mode, state.drawing.points.length);
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay } = context;
    const drawing = state.drawing;
    if (!drawing || (drawing.type !== "polygon" && drawing.type !== "linestrip")) return false;
    drawing.cursor = point;
    renderDrawingOverlay();
    return true;
  }

  function completed(mode, pointCount) {
    notify(mode, pointCount, "completed");
    window.HelloLabelDrawingState?.idle?.();
  }

  const api = { configure, pointerDown, pointerMove, completed };
  window.HelloLabelPolygonTool = api;
})();
