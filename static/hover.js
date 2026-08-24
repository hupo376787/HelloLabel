"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  const interactionSvg = document.getElementById("interactionSvg");
  const selectedPath = document.getElementById("selectedPath");
  const instanceList = document.getElementById("instanceList");
  if (!viewport || !interactionSvg || !selectedPath) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const hoverPath = document.createElementNS(SVG_NS, "path");
  hoverPath.id = "hoverPath";
  hoverPath.setAttribute("class", "selected-path hidden-svg");
  hoverPath.setAttribute("d", "");
  hoverPath.setAttribute("aria-hidden", "true");
  interactionSvg.insertBefore(hoverPath, selectedPath);

  let hoveredId = null;

  function clearHover() {
    if (hoveredId === null && hoverPath.classList.contains("hidden-svg")) return;
    hoveredId = null;
    hoverPath.setAttribute("d", "");
    hoverPath.classList.add("hidden-svg");
  }

  function showHover(id) {
    if (!id || state.selectedIds?.has(id)) {
      clearHover();
      return;
    }
    if (id === hoveredId && !hoverPath.classList.contains("hidden-svg")) return;

    const shape = shapeAtId(id);
    if (!shape) {
      clearHover();
      return;
    }

    hoveredId = id;
    hoverPath.setAttribute("d", shapeScreenPath(shape));
    hoverPath.style.fill = isClosedType(shape.shape_type) ? "" : "none";
    hoverPath.classList.remove("hidden-svg");
  }

  function hoverCanvasAt(clientX, clientY) {
    if (!state.data || state.mode !== "pointer" || state.panning || state.editing) {
      clearHover();
      return;
    }

    const p = screenToImage(clientX, clientY);
    if (p[0] < 0 || p[1] < 0 || p[0] > state.width || p[1] > state.height) {
      clearHover();
      return;
    }

    const hit = findShapeAt(p[0], p[1]);
    if (!hit) {
      clearHover();
      return;
    }
    showHover(hit.id);
  }

  viewport.addEventListener("pointermove", ev => {
    hoverCanvasAt(ev.clientX, ev.clientY);
  }, { passive: true });

  viewport.addEventListener("pointerleave", clearHover, { passive: true });
  viewport.addEventListener("pointerdown", clearHover, { capture: true, passive: true });
  viewport.addEventListener("wheel", clearHover, { passive: true });
  window.addEventListener("blur", clearHover);

  // Keep the instance list and canvas consistent: hovering a list row highlights
  // the corresponding shape without changing the actual selection.
  instanceList?.addEventListener("pointermove", ev => {
    if (!state.data || state.mode !== "pointer") {
      clearHover();
      return;
    }
    const row = ev.target.closest?.("[data-shape-id]");
    if (!row) {
      clearHover();
      return;
    }
    showHover(row.dataset.shapeId);
  }, { passive: true });
  instanceList?.addEventListener("pointerleave", clearHover, { passive: true });
})();
