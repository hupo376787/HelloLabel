"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  const interactionSvg = document.getElementById("interactionSvg");
  if (!viewport || !interactionSvg) return;

  const SVG_NS = "http://www.w3.org/2000/svg";
  const SNAP_PX = 12;
  const EDGE_SNAP_PX = 9;
  let edgeSnap = null;
  let reopened = null;
  let suppressNextContextMenu = false;

  const snapMarker = document.createElementNS(SVG_NS, "circle");
  snapMarker.id = "geometrySnapMarker";
  snapMarker.setAttribute("r", "6");
  snapMarker.setAttribute("fill", "rgba(255,213,79,.18)");
  snapMarker.setAttribute("stroke", "var(--selection)");
  snapMarker.setAttribute("stroke-width", "2.5");
  snapMarker.setAttribute("vector-effect", "non-scaling-stroke");
  snapMarker.setAttribute("pointer-events", "none");
  snapMarker.classList.add("hidden-svg");
  interactionSvg.appendChild(snapMarker);

  function langText(zh, en) {
    return state?.language === "en" ? en : zh;
  }

  function showSnapAtImage(point) {
    const p = imageToViewport(point[0], point[1]);
    snapMarker.setAttribute("cx", String(p[0]));
    snapMarker.setAttribute("cy", String(p[1]));
    snapMarker.classList.remove("hidden-svg");
  }

  function clearSnap() {
    edgeSnap = null;
    snapMarker.classList.add("hidden-svg");
  }

  function projectToSegment(point, a, b) {
    const vx = Number(b[0]) - Number(a[0]);
    const vy = Number(b[1]) - Number(a[1]);
    const wx = Number(point[0]) - Number(a[0]);
    const wy = Number(point[1]) - Number(a[1]);
    const len2 = vx * vx + vy * vy;
    if (len2 < 1e-12) return null;
    let ratio = (wx * vx + wy * vy) / len2;
    ratio = Math.max(0, Math.min(1, ratio));
    const x = Number(a[0]) + vx * ratio;
    const y = Number(a[1]) + vy * ratio;
    return { point: [x, y], ratio, distance: Math.hypot(Number(point[0]) - x, Number(point[1]) - y) };
  }

  function nearbyShapeIds(point) {
    const gridSize = typeof HIT_GRID === "number" ? HIT_GRID : 256;
    const gx = Math.floor(point[0] / gridSize);
    const gy = Math.floor(point[1] / gridSize);
    const ids = new Set();
    for (let y = gy - 1; y <= gy + 1; y++) {
      for (let x = gx - 1; x <= gx + 1; x++) {
        for (const id of state.shapeGrid?.get(`${x},${y}`) || []) ids.add(id);
      }
    }
    return ids;
  }

  function findEditableEdge(point) {
    if (!state.data || state.drawing || state.editing || state.panning) return null;
    let best = null;
    let bestScreenDistance = Infinity;

    for (const id of nearbyShapeIds(point)) {
      const shape = shapeAtId(id);
      if (!shape || (shape.shape_type !== "polygon" && shape.shape_type !== "linestrip")) continue;
      const points = shape.points || [];
      if (points.length < 2) continue;
      const segmentCount = shape.shape_type === "polygon" ? points.length : points.length - 1;
      for (let index = 0; index < segmentCount; index++) {
        const next = (index + 1) % points.length;
        const projected = projectToSegment(point, points[index], points[next]);
        if (!projected) continue;
        const screenDistance = projected.distance * state.scale;
        if (screenDistance > EDGE_SNAP_PX || screenDistance >= bestScreenDistance) continue;

        // Near an existing corner, keep the existing handle behavior rather than
        // creating a duplicate vertex on top of it.
        const endpointDistance = Math.min(
          Math.hypot(projected.point[0] - points[index][0], projected.point[1] - points[index][1]),
          Math.hypot(projected.point[0] - points[next][0], projected.point[1] - points[next][1])
        ) * state.scale;
        if (endpointDistance <= 7) continue;

        bestScreenDistance = screenDistance;
        best = { id, shape, segmentIndex: index, point: projected.point };
      }
    }
    return best;
  }

  function polygonStartSnap(clientX, clientY) {
    const drawing = state.drawing;
    if (!drawing || drawing.type !== "polygon" || !Array.isArray(drawing.points) || drawing.points.length < 3) return null;
    const point = clampImagePoint(screenToImage(clientX, clientY));
    const first = drawing.points[0];
    return Math.hypot(point[0] - first[0], point[1] - first[1]) * state.scale <= SNAP_PX ? [first[0], first[1]] : null;
  }

  function insertSnappedVertex(candidate) {
    const shape = shapeAtId(candidate.id);
    if (!shape || !Array.isArray(shape.points)) return false;
    pushHistory();
    shape.points.splice(candidate.segmentIndex + 1, 0, clampImagePoint(candidate.point));
    markDirty(t("vertexInserted"));
    renderAll();
    selectId(candidate.id, { scroll: true });
    state.activeHandle = { index: candidate.segmentIndex + 1, kind: "point" };
    renderSelectedOverlay();
    scheduleInstanceListRender();
    clearSnap();
    return true;
  }

  const originalCommitGeometry = commitGeometry;
  const originalCancelDrawing = cancelDrawing;

  function removeShapeTransient(id) {
    const index = state.runtimeIds.indexOf(id);
    if (index < 0) return null;
    const shape = state.data?.shapes?.[index];
    if (!shape) return null;

    const info = {
      id,
      index,
      shape: deepClone(shape),
      meta: deepClone(state.runtimeMeta?.[id] || {}),
      label: shape.label,
      historyLength: state.history.length,
      future: deepClone(state.future),
      hadSaveTimer: !!state.saveTimer
    };

    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
      state.saveTimer = 0;
    }
    pushHistory();
    state.data.shapes.splice(index, 1);
    state.runtimeIds.splice(index, 1);
    delete state.runtimeMeta[id];
    state.selectedIds.delete(id);
    state.primaryId = null;
    state.activeHandle = null;
    return info;
  }

  function restoreReopenedOriginal({ keepHistory = false } = {}) {
    if (!reopened || !state.data) return;
    const info = reopened;
    reopened = null;
    const index = Math.max(0, Math.min(info.index, state.data.shapes.length));
    state.data.shapes.splice(index, 0, deepClone(info.shape));
    state.runtimeIds.splice(index, 0, info.id);
    state.runtimeMeta[info.id] = deepClone(info.meta);
    if (!keepHistory) {
      state.history.length = info.historyLength;
      state.future = deepClone(info.future);
    }
    renderAll();
    selectId(info.id, { scroll: true });
    if (state.dirty && !state.saveTimer) scheduleAutoSave();
  }

  cancelDrawing = function(status = true) {
    const hadReopened = !!reopened;
    const result = originalCancelDrawing(status);
    if (hadReopened) restoreReopenedOriginal();
    clearSnap();
    return result;
  };

  commitGeometry = async function(type, points, meta = { source: "manual" }) {
    if (!reopened) return originalCommitGeometry(type, points, meta);
    if (!state.data || !points?.length) return;

    const info = reopened;
    reopened = null;
    const index = Math.max(0, Math.min(info.index, state.data.shapes.length));
    const shape = makeShape(info.label, type, points);
    state.data.shapes.splice(index, 0, shape);
    state.runtimeIds.splice(index, 0, info.id);
    state.runtimeMeta[info.id] = deepClone(info.meta);
    state.activeLabel = info.label;
    markDirty(t("modifiedWaiting"));
    renderAll();
    selectId(info.id, { scroll: true, ensure: true });
    setStatus(langText("已完成图形重新编辑。", "Finished editing the reopened shape."));
    clearSnap();
  };

  function reopenCompletedShape(hit, clientX, clientY) {
    if (!hit || reopened || state.drawing) return false;
    const shape = hit.shape;
    const type = shape.shape_type;
    if (!["polygon", "linestrip", "rectangle", "circle", "line", "oriented_rectangle"].includes(type)) return false;

    const info = removeShapeTransient(hit.id);
    if (!info) return false;
    reopened = info;
    state.activeLabel = info.label;

    const mode = type;
    setMode(mode);
    const points = deepClone(info.shape.points || []);
    const pointer = clampImagePoint(screenToImage(clientX, clientY));

    if (type === "polygon" || type === "linestrip") {
      state.drawing = { type, points, cursor: pointer };
    } else if (type === "rectangle" || type === "circle") {
      state.drawing = { type, start: points[0], current: points[1] || pointer };
    } else if (type === "line") {
      state.drawing = { type, points: points.slice(0, 1), cursor: points[1] || pointer };
    } else if (type === "oriented_rectangle") {
      state.drawing = { type, points: points.slice(0, 2), cursor: points[2] || pointer };
    }

    renderAll();
    renderDrawingOverlay();
    setStatus(langText("已回到该图形的绘制状态；右键可继续逐点回撤。", "Returned to drawing state; right-click can continue rolling vertices back."));
    return true;
  }

  // When a reopened polygon/polyline is rolled all the way back to zero points,
  // keep it deleted. The history snapshot created on reopen still allows a normal
  // Ctrl/Cmd+Z to restore the completed shape later.
  window.helloLabelDrawingEmptied = () => {
    if (!reopened) return;
    reopened = null;
    markDirty(t("instancesDeleted", { count: 1 }));
    renderAll();
    clearSnap();
  };

  viewport.addEventListener("pointermove", event => {
    if (!state.data) {
      clearSnap();
      return;
    }

    const closePoint = polygonStartSnap(event.clientX, event.clientY);
    if (closePoint) {
      state.drawing.cursor = [closePoint[0], closePoint[1]];
      showSnapAtImage(closePoint);
      renderDrawingOverlay();
      event.stopImmediatePropagation();
      return;
    }

    if (state.drawing) {
      clearSnap();
      return;
    }

    if (state.mode === "pointer") {
      const point = clampImagePoint(screenToImage(event.clientX, event.clientY));
      edgeSnap = findEditableEdge(point);
      if (edgeSnap) showSnapAtImage(edgeSnap.point); else clearSnap();
    } else {
      clearSnap();
    }
  }, true);

  viewport.addEventListener("pointerdown", event => {
    if (!state.data) return;

    if (event.button === 0) {
      const closePoint = polygonStartSnap(event.clientX, event.clientY);
      if (closePoint) {
        state.drawing.cursor = [closePoint[0], closePoint[1]];
        clearSnap();
        void finishSequenceDrawing();
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }

      if (!state.drawing && state.mode === "pointer") {
        const point = clampImagePoint(screenToImage(event.clientX, event.clientY));
        const candidate = findEditableEdge(point);
        if (candidate && insertSnappedVertex(candidate)) {
          event.preventDefault();
          event.stopPropagation();
          event.stopImmediatePropagation();
        }
      }
      return;
    }

    if (event.button === 2 && !state.drawing) {
      const point = clampImagePoint(screenToImage(event.clientX, event.clientY));
      const hit = findShapeAt(point[0], point[1]);
      if (hit && reopenCompletedShape(hit, event.clientX, event.clientY)) {
        suppressNextContextMenu = true;
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
      }
    }
  }, true);

  // Double-click no longer closes polygons or inserts polygon/polyline vertices.
  // Polygon completion is now an explicit snap-to-start + single click action,
  // while completed-edge insertion is a single snapped click.
  viewport.addEventListener("dblclick", event => {
    if (state.drawing?.type === "polygon" || (state.mode === "pointer" && !state.drawing)) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }, true);

  viewport.addEventListener("contextmenu", event => {
    if (!suppressNextContextMenu) return;
    suppressNextContextMenu = false;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }, true);

  viewport.addEventListener("pointerleave", clearSnap, { passive: true });
  viewport.addEventListener("wheel", clearSnap, { passive: true });
})();
