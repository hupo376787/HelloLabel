"use strict";

// Drawing modules should only report state changes here.
// The mobile toolbar listens to the same event and updates itself.
// This keeps desktop drawing behavior independent from mobile UI.

window.notifyMobileToolbarState = function(detail = {}) {
  window.dispatchEvent(new CustomEvent("hellolabel:drawing-state", {
    detail: {
      tool: detail.tool || "idle",
      phase: detail.phase || "idle",
      ...detail
    }
  }));
};

window.HelloLabelDrawingState = {
  polygon(pointCount, phase = "drawing") {
    window.notifyMobileToolbarState({
      tool: "polygon",
      phase,
      pointCount
    });
  },

  rectangle(phase = "completed") {
    window.notifyMobileToolbarState({
      tool: "rectangle",
      phase
    });
  },

  brush(phase = "drawing") {
    window.notifyMobileToolbarState({
      tool: "brush",
      phase
    });
  },

  circle(phase = "drawing") {
    window.notifyMobileToolbarState({
      tool: "circle",
      phase
    });
  },

  orientedRectangle(phase) {
    window.notifyMobileToolbarState({
      tool: "oriented_rectangle",
      phase
    });
  },

  selected(shapeId, label) {
    window.notifyMobileToolbarState({
      tool: "selected",
      phase: "selected",
      shapeId,
      label
    });
  },

  idle() {
    window.notifyMobileToolbarState({
      tool: "idle",
      phase: "idle"
    });
  }
};
