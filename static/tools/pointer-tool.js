"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function translatePoints(points, dx, dy) {
    const { clampImagePoint } = context;
    return points.map(point => clampImagePoint([Number(point[0]) + dx, Number(point[1]) + dy]));
  }

  function dragOrientedCorner(points, index, newPoint) {
    const { clampImagePoint } = context;
    const p = points.map(point => [Number(point[0]), Number(point[1])]);
    if (p.length !== 4) { p[index] = newPoint; return p; }

    const opposite = (index + 2) % 4, previous = (opposite + 3) % 4, next = (opposite + 1) % 4;
    const origin = p[opposite];
    let ux = p[previous][0] - origin[0], uy = p[previous][1] - origin[1];
    let vx = p[next][0] - origin[0], vy = p[next][1] - origin[1];
    const ul = Math.hypot(ux, uy) || 1, vl = Math.hypot(vx, vy) || 1;
    ux /= ul; uy /= ul; vx /= vl; vy /= vl;
    const dx = newPoint[0] - origin[0], dy = newPoint[1] - origin[1];
    const a = dx * ux + dy * uy, b = dx * vx + dy * vy;
    const result = p.slice();
    result[opposite] = origin;
    result[previous] = clampImagePoint([origin[0] + ux * a, origin[1] + uy * a]);
    result[next] = clampImagePoint([origin[0] + vx * b, origin[1] + vy * b]);
    result[index] = clampImagePoint([origin[0] + ux * a + vx * b, origin[1] + uy * a + vy * b]);
    return result;
  }

  function applyHandleDrag(shape, index, kind, newPoint, original) {
    const { rectCorners, clampImagePoint, deepClone } = context;
    const type = shape.shape_type;
    if (type === "rectangle") {
      const corners = rectCorners(original.points), opposite = corners[(index + 2) % 4];
      shape.points = [clampImagePoint(newPoint), clampImagePoint(opposite)];
      return;
    }
    if (type === "oriented_rectangle") {
      shape.points = dragOrientedCorner(original.points, index, newPoint);
      return;
    }
    if (type === "circle" && index === 0) {
      const old = original.points[0], dx = newPoint[0] - old[0], dy = newPoint[1] - old[1];
      shape.points = [clampImagePoint(newPoint), clampImagePoint([original.points[1][0] + dx, original.points[1][1] + dy])];
      return;
    }
    const points = deepClone(original.points);
    points[index] = clampImagePoint(newPoint);
    shape.points = points;
  }

  function nearestVisibleControlHandle(point, pointerType) {
    const { state, primaryShape, pointerProfile, controlPointsForShape } = context;
    if (pointerProfile(pointerType).pointerType === "mouse") return null;
    const shape = primaryShape();
    if (!shape || !state.primaryId) return null;
    const profile = pointerProfile(pointerType), limit = profile.vertexHitPx / Math.max(.0001, state.scale);
    let best = null, bestDistance = Infinity;
    for (const handle of controlPointsForShape(shape)) {
      const distance = Math.hypot(Number(handle.p[0]) - point[0], Number(handle.p[1]) - point[1]);
      if (distance <= limit && distance < bestDistance) {
        best = { id: state.primaryId, index: handle.index, kind: handle.kind };
        bestDistance = distance;
      }
    }
    return best;
  }

  function capture(event) {
    return window.helloLabelPointerInput?.capture?.(event)
      ?? (context.els.viewport.setPointerCapture?.(event.pointerId), true);
  }

  function begin(event) {
    if (!context) return false;
    const { state, clampImagePoint, screenToImage, selectId, deepClone, shapeAtId, renderSelectedOverlay, findShapeAt, clearSelection } = context;
    if (state.mode !== "pointer" || event.button !== 0) return false;

    const point = clampImagePoint(screenToImage(event.clientX, event.clientY));
    const target = event.target.closest?.(".control-handle");
    const near = target ? null : nearestVisibleControlHandle(point, event.pointerType);

    if (target || near) {
      const id = target?.dataset.shapeId || near.id;
      const index = target ? Number(target.dataset.handleIndex) : near.index;
      const handleKind = target?.dataset.handleKind || near.kind;
      selectId(id);
      state.activeHandle = { index, kind: handleKind };
      state.editing = {
        kind:"handle", id, index, handleKind, start:point, startClient:[event.clientX,event.clientY],
        original:deepClone(shapeAtId(id)), historyPushed:false, moved:false,
        pointerType:event.pointerType||"mouse", pointerId:event.pointerId,
        historyLength:state.history.length, futureBefore:deepClone(state.future)
      };
      capture(event);
      renderSelectedOverlay();
      return true;
    }

    const hit = findShapeAt(point[0], point[1], event.pointerType);
    if (!hit) { clearSelection(); return false; }

    selectId(hit.id, { additive:event.ctrlKey||event.metaKey });
    if (event.ctrlKey || event.metaKey) return true;

    state.editing = {
      kind:"move", id:hit.id, start:point, startClient:[event.clientX,event.clientY],
      original:deepClone(hit.shape), historyPushed:false, moved:false,
      pointerType:event.pointerType||"mouse", pointerId:event.pointerId,
      historyLength:state.history.length, futureBefore:deepClone(state.future)
    };
    capture(event);
    return true;
  }

  function move(event) {
    if (!context) return false;
    const { state, pushHistory, buildRenderCache, buildLabelAtlas, clampImagePoint, screenToImage, shapeAtId, renderSelectedOverlay, scheduleViewportRender } = context;
    const editing = state.editing;
    if (!editing) return false;

    const movedPx = Math.hypot(event.clientX-editing.startClient[0], event.clientY-editing.startClient[1]);
    if (!editing.moved && movedPx < 2) return true;
    if (!editing.historyPushed) {
      pushHistory();
      editing.historyPushed = true;
      editing.moved = true;
      buildRenderCache(new Set([editing.id]));
      buildLabelAtlas();
    }

    const point = clampImagePoint(screenToImage(event.clientX,event.clientY));
    const shape = shapeAtId(editing.id);
    if (!shape) return true;
    if (editing.kind === "move") {
      const dx = point[0]-editing.start[0], dy = point[1]-editing.start[1];
      shape.points = translatePoints(editing.original.points, dx, dy);
    } else applyHandleDrag(shape, editing.index, editing.handleKind, point, editing.original);

    renderSelectedOverlay();
    scheduleViewportRender();
    return true;
  }

  function end() {
    if (!context) return false;
    const { state, markDirty, t, renderAll, selectId } = context;
    const editing = state.editing;
    if (!editing) return false;
    state.editing = null;
    window.helloLabelPointerInput?.release?.(editing.pointerId);
    if (editing.moved) {
      markDirty(editing.kind==="move" ? t("instanceMoved") : t("controlPointMoved"));
      renderAll();
      selectId(editing.id);
    }
    return true;
  }

  function cancel() {
    if (!context) return false;
    const { state, shapeAtId, deepClone, buildRenderCache, buildLabelAtlas, renderAll, selectId, renderSelectedOverlay, scheduleViewportRender } = context;
    const editing = state.editing;
    if (!editing) return false;
    state.editing = null;
    window.helloLabelPointerInput?.release?.(editing.pointerId);

    if (editing.moved) {
      const shape = shapeAtId(editing.id);
      if (shape && editing.original) Object.assign(shape, deepClone(editing.original));
      if (editing.historyPushed) {
        state.history.length = Math.min(state.history.length, editing.historyLength);
        state.future = deepClone(editing.futureBefore || []);
      }
      buildRenderCache();
      buildLabelAtlas();
      renderAll();
      selectId(editing.id);
    } else {
      renderSelectedOverlay();
      scheduleViewportRender();
    }
    return true;
  }

  const api = { configure, begin, move, end, cancel };
  window.HelloLabelPointerTool = api;
})();
