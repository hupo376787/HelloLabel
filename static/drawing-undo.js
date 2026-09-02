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

  // While an unfinished polygon/polyline exists, Ctrl/Cmd+Z is intentionally
  // ignored. Single-point rollback is mouse-right-click only, so the normal
  // history stack cannot accidentally undo an older completed annotation while
  // the user is still placing vertices.
  window.addEventListener("keydown", event => {
    if (!activeSequenceDrawing()) return;
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || String(event.key).toLowerCase() !== "z") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  // Right-click removes exactly one vertex from an unfinished polygon/polyline.
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
