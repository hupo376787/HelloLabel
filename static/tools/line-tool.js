"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function pointerDown(point) {
    if (!context) return false;
    const { state, setStatus, t, renderDrawingOverlay, finishSequenceDrawing } = context;

    if (!state.drawing) {
      state.drawing = { type: "line", points: [point], cursor: point };
      setStatus(t("lineHint"));
    } else if (state.drawing.type === "line") {
      state.drawing.points.push(point);
      state.drawing.cursor = point;
      void finishSequenceDrawing();
    } else {
      return false;
    }

    renderDrawingOverlay();
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay } = context;
    if (state.drawing?.type !== "line") return false;

    state.drawing.cursor = point;
    renderDrawingOverlay();
    return true;
  }

  const api = { configure, pointerDown, pointerMove };
  window.HelloLabelLineTool = api;
})();
