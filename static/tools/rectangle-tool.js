"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function pointerDown(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay, setStatus, t, dist2, shapeTypeText, commitGeometry } = context;

    if (!state.drawing) {
      state.drawing = { type: "rectangle", start: point, current: point };
      setStatus(t("rectSecond"));
      renderDrawingOverlay();
      window.HelloLabelDrawingState?.rectangle?.("drawing");
      return true;
    }
    if (state.drawing.type !== "rectangle" || !state.drawing.start) return false;

    const drawing = state.drawing;
    drawing.current = point;
    const screenDist = Math.sqrt(dist2(drawing.start, point)) * state.scale;
    const points = [drawing.start, drawing.current];

    state.drawing = null;
    renderDrawingOverlay();

    if (screenDist >= 3) {
      window.HelloLabelDrawingState?.rectangle?.("completed");
      window.HelloLabelDrawingState?.idle?.();
      void commitGeometry("rectangle", points);
    } else {
      window.HelloLabelDrawingState?.idle?.();
      setStatus(t("tooSmall", { type: shapeTypeText("rectangle") }));
    }
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay } = context;
    if (state.drawing?.type !== "rectangle") return false;
    state.drawing.cursor = point;
    state.drawing.current = point;
    renderDrawingOverlay();
    return true;
  }

  const api = { configure, pointerDown, pointerMove };
  window.HelloLabelRectangleTool = api;
})();
