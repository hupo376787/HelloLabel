"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function pointerDown(point) {
    if (!context) return false;
    const {
      state, renderDrawingOverlay, setStatus, t,
      dist2, shapeTypeText, commitGeometry
    } = context;

    if (!state.drawing) {
      state.drawing = { type: "circle", start: point, current: point, cursor: point };
      setStatus(t("circleSecond"));
      renderDrawingOverlay();
      window.HelloLabelDrawingState?.circle?.("drawing");
      return true;
    }

    if (state.drawing.type !== "circle" || !state.drawing.start) return false;

    const drawing = state.drawing;
    drawing.current = point;
    drawing.cursor = point;

    const screenDist = Math.sqrt(dist2(drawing.start, point)) * state.scale;
    const points = [drawing.start, drawing.current];

    state.drawing = null;
    renderDrawingOverlay();

    if (screenDist >= 3) {
      window.HelloLabelDrawingState?.circle?.("completed");
      window.HelloLabelDrawingState?.idle?.();
      void commitGeometry("circle", points);
    } else {
      window.HelloLabelDrawingState?.idle?.();
      setStatus(t("tooSmall", { type: shapeTypeText("circle") }));
    }
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay } = context;
    if (state.drawing?.type !== "circle") return false;

    state.drawing.cursor = point;
    state.drawing.current = point;
    renderDrawingOverlay();
    return true;
  }

  const api = { configure, pointerDown, pointerMove };
  window.HelloLabelCircleTool = api;
})();
