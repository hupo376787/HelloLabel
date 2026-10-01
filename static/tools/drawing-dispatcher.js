"use strict";

(() => {
  let context = null;

  const drawingTypeToMode = {
    pen: "pen",
    polygon: "polygon",
    linestrip: "linestrip",
    rectangle: "rectangle",
    oriented_rectangle: "oriented_rectangle",
    circle: "circle",
    line: "line"
  };

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function imagePoint(event) {
    const { clampImagePoint, screenToImage } = context;
    return clampImagePoint(screenToImage(event.clientX, event.clientY));
  }

  function pointerDown(event) {
    if (!context || event.button !== 0 || !context.state.data) return false;

    const mode = context.state.mode;
    const tool = context.tools?.[mode];
    if (!tool?.pointerDown) return false;

    return !!tool.pointerDown(imagePoint(event), mode, event);
  }

  function pointerMove(event) {
    if (!context?.state.drawing) return false;

    const mode = drawingTypeToMode[context.state.drawing.type];
    const tool = context.tools?.[mode];
    if (!tool?.pointerMove) return false;

    return !!tool.pointerMove(imagePoint(event), mode, event);
  }

  function pointerUp(_event) {
    return false;
  }

  const api = { configure, pointerDown, pointerMove, pointerUp };
  window.HelloLabelDrawingDispatcher = api;
})();
