"use strict";

window.HelloLabelState = window.HelloLabelState || {
  mode: "pointer",
  selectedShape: null,
  drawing: null,
  images: [],
  currentImageIndex: -1,
  shapes: [],
  labels: [],
  viewport: {
    zoom: 1,
    offsetX: 0,
    offsetY: 0
  },

  setMode(mode) {
    this.mode = mode;
    window.dispatchEvent(new CustomEvent("hellolabel:mode-changed", {
      detail: { mode }
    }));
  },

  selectShape(shape) {
    this.selectedShape = shape || null;
    window.dispatchEvent(new CustomEvent("hellolabel:selection-changed", {
      detail: { shape }
    }));
  },

  clearSelection() {
    this.selectedShape = null;
    window.dispatchEvent(new CustomEvent("hellolabel:selection-cleared"));
  }
};
