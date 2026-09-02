"use strict";

(() => {
  let suppressNextContextMenu = false;

  function activeSequenceDrawing() {
    const drawing = typeof state !== "undefined" ? state?.drawing : null;
    return drawing && (drawing.type === "polygon" || drawing.type === "linestrip") ? drawing : null;
  }

  function undoDrawingPoint() {
    const drawing = activeSequenceDrawing();
    if (!drawing || !Array.isArray(drawing.points) || drawing.points.length === 0) return false;

    drawing.points.pop();
    const emptied = drawing.points.length === 0;
    if (emptied) {
      state.drawing = null;
    }

    if (typeof renderDrawingOverlay === "function") renderDrawingOverlay();
    if (typeof setStatus === "function") {
      const en = state?.language === "en";
      setStatus(state.drawing
        ? (en ? `Removed last point. ${state.drawing.points.length} point(s) remain.` : `已回撤最后一个点，剩余 ${state.drawing.points.length} 个点。`)
        : (en ? "All drawing points removed." : "已回撤全部绘制点。"));
    }

    if (emptied && typeof window.helloLabelDrawingEmptied === "function") {
      try { window.helloLabelDrawingEmptied(); } catch (err) { console.error(err); }
    }
    return true;
  }

  const viewport = document.getElementById("viewport");
  if (!viewport) return;

  // Point rollback is deliberately mouse-only: right-click removes one vertex.
  // Ctrl/Cmd+Z remains the application's normal history undo shortcut.
  viewport.addEventListener("pointerdown", event => {
    if (event.button !== 2 || !activeSequenceDrawing()) return;
    if (undoDrawingPoint()) {
      suppressNextContextMenu = true;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  viewport.addEventListener("contextmenu", event => {
    if (!suppressNextContextMenu && !activeSequenceDrawing()) return;
    suppressNextContextMenu = false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);
})();
