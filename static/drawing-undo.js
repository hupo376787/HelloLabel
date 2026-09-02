"use strict";

(() => {
  let suppressNextContextMenu = false;

  function activeSequenceDrawing() {
    const drawing = typeof state !== "undefined" ? state?.drawing : null;
    return drawing && (drawing.type === "polygon" || drawing.type === "linestrip") ? drawing : null;
  }

  function modalIsOpen() {
    return typeof els !== "undefined" && els?.modalBackdrop && !els.modalBackdrop.classList.contains("hidden");
  }

  function undoDrawingPoint() {
    const drawing = activeSequenceDrawing();
    if (!drawing || !Array.isArray(drawing.points) || drawing.points.length === 0) return false;

    drawing.points.pop();
    if (drawing.points.length === 0) {
      state.drawing = null;
    }

    if (typeof renderDrawingOverlay === "function") renderDrawingOverlay();
    if (typeof setStatus === "function") {
      const en = state?.language === "en";
      setStatus(state.drawing
        ? (en ? `Removed last point. ${state.drawing.points.length} point(s) remain.` : `已回撤最后一个点，剩余 ${state.drawing.points.length} 个点。`)
        : (en ? "All drawing points removed." : "已回撤全部绘制点。"));
    }
    return true;
  }

  // Capture Ctrl/Cmd+Z before the application's normal undo handler so an
  // unfinished polygon/polyline loses one vertex instead of undoing saved data.
  window.addEventListener("keydown", event => {
    if (modalIsOpen()) return;
    const target = event.target;
    const editable = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
    if (editable) return;
    if (!(event.ctrlKey || event.metaKey) || event.shiftKey || String(event.key).toLowerCase() !== "z") return;
    if (!activeSequenceDrawing()) return;

    if (undoDrawingPoint()) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  const viewport = document.getElementById("viewport");
  if (!viewport) return;

  // Right-click is a quick single-vertex rollback while drawing polygons or
  // polylines. Handle pointerdown so feedback is immediate and suppress the
  // matching contextmenu event even when that click removes the final point.
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
