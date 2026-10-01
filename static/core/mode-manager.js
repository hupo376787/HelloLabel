"use strict";

(() => {
  const MODE_STATUS_KEYS = {
    pointer:"modePointer",
    pen:"modePen",
    polygon:"modePolygon",
    rectangle:"modeRectangle",
    oriented_rectangle:"modeObb",
    circle:"modeCircle",
    point:"modePoint",
    line:"modeLine",
    linestrip:"modeLinestrip",
    sam:"modeSam"
  };

  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function set(mode, { keepSam = false } = {}) {
    if (!context) return false;

    const {
      state, buttons, viewport,
      cancelDrawing, resetSamState,
      renderSelectedOverlay, updateActionButtons,
      setStatus, t
    } = context;

    if (!buttons?.[mode]) return false;
    if (state.drawing) cancelDrawing(false);
    if (state.mode === "sam" && mode !== "sam" && !keepSam) resetSamState();

    state.mode = mode;

    for (const [name, button] of Object.entries(buttons)) {
      button?.classList.toggle("active", name === mode);
    }

    viewport?.classList.toggle("draw-mode", !["pointer", "sam"].includes(mode));
    viewport?.classList.toggle("sam-mode", mode === "sam");

    state.activeHandle = null;
    renderSelectedOverlay();
    updateActionButtons();

    const key = MODE_STATUS_KEYS[mode];
    if (key) setStatus(t(key));

    window.dispatchEvent(new CustomEvent("hellolabel:mode-changed", {
      detail: { mode }
    }));
    return true;
  }

  function get() {
    return context?.state?.mode || "pointer";
  }

  const api = { configure, set, get };
  window.HelloLabelMode = api;
})();
