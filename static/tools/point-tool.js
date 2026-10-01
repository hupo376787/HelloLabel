"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function pointerDown(point) {
    if (!context) return false;
    void context.commitGeometry("point", [point]);
    return true;
  }

  const api = { configure, pointerDown };
  window.HelloLabelPointTool = api;
})();
