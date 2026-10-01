"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function fromEdge(a, b, c) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) return [a, b, b, a];
    const nx = -dy / len, ny = dx / len;
    const h = (c[0] - b[0]) * nx + (c[1] - b[1]) * ny;
    return [a, b, [b[0] + nx * h, b[1] + ny * h], [a[0] + nx * h, a[1] + ny * h]];
  }

  function pointerDown(point) {
    if (!context) return false;
    const { state, setStatus, t, renderDrawingOverlay, finishSequenceDrawing } = context;

    if (!state.drawing) {
      state.drawing = { type: "oriented_rectangle", points: [point], cursor: point };
      setStatus(t("obbSecond"));
      window.HelloLabelDrawingState?.orientedRectangle?.("direction");
    } else if (state.drawing.type === "oriented_rectangle" && state.drawing.points.length === 1) {
      state.drawing.points.push(point);
      state.drawing.cursor = point;
      setStatus(t("obbWidth"));
      window.HelloLabelDrawingState?.orientedRectangle?.("width");
    } else if (state.drawing.type === "oriented_rectangle") {
      const points = fromEdge(state.drawing.points[0], state.drawing.points[1], point);
      state.drawing = { type: "oriented_rectangle", points, cursor: null };
      void finishSequenceDrawing();
    } else return false;

    renderDrawingOverlay();
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay } = context;
    if (state.drawing?.type !== "oriented_rectangle") return false;
    state.drawing.cursor = point;
    renderDrawingOverlay();
    return true;
  }

  function completed() {
    window.HelloLabelDrawingState?.orientedRectangle?.("completed");
    window.HelloLabelDrawingState?.idle?.();
  }

  const api = { configure, fromEdge, pointerDown, pointerMove, completed };
  window.HelloLabelObbTool = api;
})();
