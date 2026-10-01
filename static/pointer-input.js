"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  if (!viewport || window.helloLabelPointerInput) return;

  const PROFILES = Object.freeze({
    mouse: Object.freeze({
      pointerType: "mouse",
      shapeHitPx: 8,
      vertexHitPx: 10,
      edgeHitPx: 9,
      polygonStartHitPx: 12,
      allowHover: true,
    }),
    pen: Object.freeze({
      pointerType: "pen",
      shapeHitPx: 10,
      vertexHitPx: 12,
      edgeHitPx: 11,
      polygonStartHitPx: 14,
      allowHover: true,
    }),
    touch: Object.freeze({
      pointerType: "touch",
      shapeHitPx: 18,
      vertexHitPx: 22,
      edgeHitPx: 18,
      polygonStartHitPx: 24,
      allowHover: false,
    }),
  });

  const TOUCH_DRAG_THRESHOLD_PX = 5;
  const TOUCH_DRAG_STAGE_MODES = new Set(["rectangle", "circle", "line", "oriented_rectangle"]);
  const TOUCH_TOOL_POLICY = Object.freeze({
    pointer: "tap-select / drag-edit",
    pen: "single-finger trace",
    polygon: "single-finger vertex taps",
    rectangle: "tap-tap or drag",
    circle: "tap-tap or drag",
    oriented_rectangle: "edge drag/two taps, then width tap",
    point: "single tap",
    line: "two taps or drag",
    linestrip: "single-finger vertex taps",
    sam: "tap positive / drag box",
  });
  let lastPointerType = "mouse";
  const activePointers = new Map();
  let touchSession = null;
  let navigation = null;
  let navigationLock = false;
  let seenTouch = false;
  let samNegativeArmed = false;
  let touchActionBar = null;
  let touchActionRefreshRaf = 0;

  function normalizePointerType(value) {
    const type = String(value || "").toLowerCase();
    return type === "touch" || type === "pen" ? type : "mouse";
  }

  function profileFor(pointerType = lastPointerType) {
    return PROFILES[normalizePointerType(pointerType)] || PROFILES.mouse;
  }

  function pointerSnapshot(event) {
    return {
      pointerId: event.pointerId,
      pointerType: normalizePointerType(event.pointerType),
      clientX: Number(event.clientX || 0),
      clientY: Number(event.clientY || 0),
      buttons: Number(event.buttons || 0),
      button: Number(event.button || 0),
      isPrimary: event.isPrimary !== false,
      target: event.target || viewport,
      ctrlKey: !!event.ctrlKey,
      metaKey: !!event.metaKey,
      shiftKey: !!event.shiftKey,
      altKey: !!event.altKey,
    };
  }

  function capture(event) {
    if (!event || event.pointerId == null) return false;
    try {
      viewport.setPointerCapture?.(event.pointerId);
      return viewport.hasPointerCapture?.(event.pointerId) ?? true;
    } catch {
      return false;
    }
  }

  function release(pointerId) {
    if (pointerId == null) return false;
    try {
      if (!viewport.hasPointerCapture?.(pointerId)) return false;
      viewport.releasePointerCapture?.(pointerId);
      return true;
    } catch {
      return false;
    }
  }

  function touchPointers() {
    return [...activePointers.values()].filter(pointer => pointer.pointerType === "touch");
  }

  function centroid(points) {
    if (!points.length) return [0, 0];
    let x = 0;
    let y = 0;
    for (const point of points) {
      x += point.clientX;
      y += point.clientY;
    }
    return [x / points.length, y / points.length];
  }

  function pointerDistance(points) {
    if (points.length < 2) return 0;
    return Math.hypot(
      points[1].clientX - points[0].clientX,
      points[1].clientY - points[0].clientY,
    );
  }

  function makeTouchEvent(snapshot, clientX = snapshot.clientX, clientY = snapshot.clientY, buttons = 1, button = 0) {
    return {
      pointerId: snapshot.pointerId,
      pointerType: "touch",
      isPrimary: snapshot.isPrimary,
      clientX,
      clientY,
      button,
      buttons,
      target: snapshot.target || viewport,
      ctrlKey: snapshot.ctrlKey,
      metaKey: snapshot.metaKey,
      shiftKey: snapshot.shiftKey,
      altKey: snapshot.altKey,
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    };
  }

  function isTouchActionTarget(target) {
    return !!target?.closest?.(".hellolabel-touch-actions");
  }

  function queueTouchActionRefresh() {
    if (touchActionRefreshRaf) return;
    touchActionRefreshRaf = requestAnimationFrame(() => {
      touchActionRefreshRaf = 0;
      refreshTouchActions();
    });
  }

  function touchActionButton(label, action, { primary = false, active = false } = {}) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.touchAction = action;
    button.textContent = label;
    if (primary) button.classList.add("primary");
    if (active) button.classList.add("active");
    return button;
  }

  function ensureTouchActionBar() {
    if (touchActionBar) return touchActionBar;
    const style = document.createElement("style");
    style.textContent = `
      .hellolabel-touch-actions{
        position:absolute;left:50%;bottom:max(12px,env(safe-area-inset-bottom));
        transform:translateX(-50%);z-index:20;display:flex;gap:8px;align-items:center;
        padding:7px;border:1px solid color-mix(in srgb,var(--line2) 88%,transparent);
        border-radius:14px;background:color-mix(in srgb,var(--panel) 94%,transparent);
        box-shadow:0 10px 28px rgba(0,0,0,.22);backdrop-filter:blur(10px);
        pointer-events:auto;
      }
      .hellolabel-touch-actions.hidden{display:none}
      .hellolabel-touch-actions button{
        min-width:48px;min-height:44px;padding:8px 13px;border-radius:10px;font-size:13px;font-weight:650;
        touch-action:manipulation;
      }
      .hellolabel-touch-actions button.primary{border-color:color-mix(in srgb,var(--accent) 65%,var(--line2));}
      .hellolabel-touch-actions button.active{background:color-mix(in srgb,var(--accent) 22%,var(--panel2));border-color:var(--accent);}
    `;
    document.head.appendChild(style);
    touchActionBar = document.createElement("div");
    touchActionBar.className = "hellolabel-touch-actions hidden";
    touchActionBar.setAttribute("role", "toolbar");
    touchActionBar.setAttribute("aria-label", "Touch annotation actions");
    viewport.appendChild(touchActionBar);
    touchActionBar.addEventListener("click", event => {
      const button = event.target.closest?.("button[data-touch-action]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      const action = button.dataset.touchAction;
      if (action === "undo-point") {
        window.helloLabelDrawingUndo?.undoDrawingPoint?.();
      } else if (action === "finish") {
        const drawing = state?.drawing;
        if (drawing?.type === "oriented_rectangle" && drawing.points?.length === 2 && drawing.cursor) {
          drawing.points = orientedRectFromEdge(drawing.points[0], drawing.points[1], drawing.cursor);
        }
        if (state?.drawing) void finishSequenceDrawing();
      } else if (action === "cancel") {
        if (state?.mode === "sam") cancelSam();
        else if (state?.drawing) cancelDrawing();
      } else if (action === "reopen") {
        window.helloLabelGeometryEdit?.reopenSelectedShape?.();
      } else if (action === "sam-negative") {
        samNegativeArmed = !samNegativeArmed;
      }
      queueTouchActionRefresh();
    });
    return touchActionBar;
  }

  function refreshTouchActions() {
    const bar = ensureTouchActionBar();
    if (!seenTouch || navigationLock || !state?.data) {
      bar.classList.add("hidden");
      bar.replaceChildren();
      return;
    }
    const en = state.language === "en";
    const buttons = [];
    const drawing = state.drawing;

    if (state.mode === "sam") {
      buttons.push(touchActionButton(
        samNegativeArmed ? (en ? "Negative: on" : "负样本：开") : (en ? "Negative" : "负样本"),
        "sam-negative",
        { active: samNegativeArmed },
      ));
      buttons.push(touchActionButton(en ? "Cancel" : "取消", "cancel"));
    } else if (drawing) {
      if ((drawing.type === "polygon" || drawing.type === "linestrip") && drawing.points?.length) {
        buttons.push(touchActionButton(en ? "Undo point" : "撤销一点", "undo-point"));
      }
      const canFinish =
        (drawing.type === "polygon" && drawing.points?.length >= 3) ||
        (drawing.type === "linestrip" && drawing.points?.length >= 2) ||
        (drawing.type === "pen" && drawing.points?.length >= 3) ||
        (drawing.type === "line" && drawing.points?.length >= 2) ||
        (drawing.type === "oriented_rectangle" && (drawing.points?.length >= 4 || (drawing.points?.length === 2 && drawing.cursor)));
      if (canFinish) buttons.push(touchActionButton(en ? "Finish" : "完成", "finish", { primary: true }));
      buttons.push(touchActionButton(en ? "Cancel" : "取消", "cancel"));
    } else if (state.mode === "pointer" && state.primaryId) {
      const shape = typeof primaryShape === "function" ? primaryShape() : null;
      if (shape && ["polygon", "linestrip", "rectangle", "circle", "line", "oriented_rectangle"].includes(shape.shape_type)) {
        buttons.push(touchActionButton(en ? "Re-edit" : "重新编辑", "reopen"));
      }
    }

    bar.replaceChildren(...buttons);
    bar.classList.toggle("hidden", buttons.length === 0);
  }

  function addTouchSamNegative(snapshot, clientX, clientY) {
    const negativeEvent = makeTouchEvent(snapshot, clientX, clientY, 0, 2);
    samNegativeArmed = false;
    const handled = !!samPointerDown(negativeEvent);
    queueTouchActionRefresh();
    return handled;
  }

  function tryTouchGeometryTap(eventLike) {
    const geometry = window.helloLabelGeometryEdit;
    if (!geometry || state.mode === "sam") return false;

    if (state.drawing?.type === "polygon") {
      const closePoint = geometry.polygonStartSnap?.(eventLike.clientX, eventLike.clientY, "touch");
      if (closePoint) {
        state.drawing.cursor = [closePoint[0], closePoint[1]];
        geometry.clearSnap?.();
        void finishSequenceDrawing();
        return true;
      }
    }

    if (!state.drawing && (state.mode === "pointer" || state.mode === "polygon" || state.mode === "linestrip")) {
      const point = clampImagePoint(screenToImage(eventLike.clientX, eventLike.clientY));
      const candidate = geometry.findEditableEdge?.(point, "touch");
      if (candidate && geometry.insertSnappedVertex?.(candidate)) return true;
    }
    return false;
  }

  function routeSingleDown(eventLike) {
    if (!state?.data) return false;
    if (typeof closeAppMenu === "function") closeAppMenu();
    if (tryTouchGeometryTap(eventLike)) return true;
    if (state.mode === "sam") return !!samPointerDown(eventLike);
    if (state.mode === "pointer") return !!beginPointerEdit(eventLike);
    return !!handleDrawPointerDown(eventLike);
  }

  function routeSingleMove(eventLike) {
    if (!state?.data) return false;
    if (state.mode === "sam") return !!samPointerMove(eventLike);
    if (state.mode === "pointer") return !!movePointerEdit(eventLike);
    return !!handleDrawPointerMove(eventLike);
  }

  function routeSingleUp(eventLike) {
    if (!state?.data) return false;
    if (state.mode === "sam") return !!samPointerUp(eventLike);
    if (state.mode === "pointer") return !!endPointerEdit();
    return !!handleDrawPointerUp(eventLike);
  }

  function restoreDrawingSnapshot() {
    if (!touchSession) return;
    if (typeof deepClone === "function") state.drawing = deepClone(touchSession.drawingBefore);
    else state.drawing = touchSession.drawingBefore || null;
    if (typeof renderDrawingOverlay === "function") renderDrawingOverlay();
  }

  function cancelSingleForNavigation() {
    if (!touchSession?.started) {
      restoreDrawingSnapshot();
      return;
    }
    if (state.mode === "pointer" && state.editing && typeof cancelPointerEdit === "function") {
      cancelPointerEdit();
    } else if (state.mode === "sam" && state.sam?.drag) {
      state.sam.drag = null;
      if (typeof renderSamOverlay === "function") renderSamOverlay();
    } else {
      restoreDrawingSnapshot();
    }
    touchSession.started = false;
  }

  function beginTouchSession(event) {
    const snapshot = pointerSnapshot(event);
    touchSession = {
      ...snapshot,
      startClientX: snapshot.clientX,
      startClientY: snapshot.clientY,
      lastClientX: snapshot.clientX,
      lastClientY: snapshot.clientY,
      started: false,
      completeStageOnUp: false,
      drawingBefore: typeof deepClone === "function" ? deepClone(state?.drawing ?? null) : (state?.drawing ?? null),
    };
    capture(event);
  }

  function startSingleTouch(clientX, clientY, { completeStageOnUp = false } = {}) {
    if (!touchSession || touchSession.started) return;
    if (state?.mode === "sam" && samNegativeArmed) samNegativeArmed = false;
    touchSession.started = true;
    touchSession.completeStageOnUp = !!completeStageOnUp;
    routeSingleDown(makeTouchEvent(touchSession, touchSession.startClientX, touchSession.startClientY, 1));
    routeSingleMove(makeTouchEvent(touchSession, clientX, clientY, 1));
  }

  function beginTwoFingerPan() {
    const points = touchPointers().slice(0, 2);
    if (points.length < 2) return false;
    cancelSingleForNavigation();
    touchSession = null;
    const [cx, cy] = centroid(points);
    const rect = viewport.getBoundingClientRect();
    const startScale = Math.max(0.0001, Number(state?.scale || 1));
    navigationLock = true;
    navigation = {
      startCentroidX: cx,
      startCentroidY: cy,
      startDistance: Math.max(1, pointerDistance(points)),
      startPanX: Number(state?.panX || 0),
      startPanY: Number(state?.panY || 0),
      startScale,
      anchorImageX: (cx - rect.left - Number(state?.panX || 0)) / startScale,
      anchorImageY: (cy - rect.top - Number(state?.panY || 0)) / startScale,
    };
    if (state) {
      state.panning = true;
      state.panStart = { kind: "touch-two-finger" };
    }
    viewport.classList.add("panning");
    return true;
  }

  function updateTwoFingerPan() {
    if (!navigation) return false;
    const points = touchPointers().slice(0, 2);
    if (points.length < 2) return true;
    const [cx, cy] = centroid(points);
    const rect = viewport.getBoundingClientRect();
    const distance = Math.max(1, pointerDistance(points));
    const scaleFactor = distance / navigation.startDistance;
    const nextScale = typeof clamp === "function"
      ? clamp(navigation.startScale * scaleFactor, 0.02, 80)
      : Math.max(0.02, Math.min(80, navigation.startScale * scaleFactor));

    state.scale = nextScale;
    state.panX = (cx - rect.left) - navigation.anchorImageX * nextScale;
    state.panY = (cy - rect.top) - navigation.anchorImageY * nextScale;
    if (typeof scheduleViewportRender === "function") scheduleViewportRender();
    return true;
  }

  function endNavigationIfFinished() {
    if (!navigationLock || touchPointers().length) return false;
    navigation = null;
    navigationLock = false;
    if (state) {
      state.panning = false;
      state.panStart = null;
    }
    viewport.classList.remove("panning");
    return true;
  }

  function consumeTouchEvent(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onPointerDown(event) {
    lastPointerType = normalizePointerType(event.pointerType);
    if (lastPointerType === "touch" && isTouchActionTarget(event.target)) {
      seenTouch = true;
      queueTouchActionRefresh();
      return;
    }
    activePointers.set(event.pointerId, pointerSnapshot(event));
    if (lastPointerType !== "touch") return;

    seenTouch = true;
    queueTouchActionRefresh();
    consumeTouchEvent(event);
    capture(event);

    if (touchPointers().length >= 2) {
      beginTwoFingerPan();
      return;
    }
    if (!navigationLock) beginTouchSession(event);
  }

  function onPointerMove(event) {
    lastPointerType = normalizePointerType(event.pointerType);
    if (lastPointerType === "touch" && isTouchActionTarget(event.target)) return;
    if (activePointers.has(event.pointerId)) activePointers.set(event.pointerId, pointerSnapshot(event));
    if (lastPointerType !== "touch") return;

    consumeTouchEvent(event);
    if (navigationLock) {
      updateTwoFingerPan();
      return;
    }
    if (!touchSession || touchSession.pointerId !== event.pointerId) return;

    touchSession.lastClientX = event.clientX;
    touchSession.lastClientY = event.clientY;
    const moved = Math.hypot(
      event.clientX - touchSession.startClientX,
      event.clientY - touchSession.startClientY,
    );

    if (state?.drawing && state.mode !== "pointer" && state.mode !== "sam") {
      routeSingleMove(makeTouchEvent(touchSession, event.clientX, event.clientY, 1));
    }

    if (!touchSession.started && moved >= TOUCH_DRAG_THRESHOLD_PX) {
      if (state.mode === "pointer" || state.mode === "pen" || state.mode === "sam") {
        startSingleTouch(event.clientX, event.clientY);
        return;
      }
      if (!touchSession.drawingBefore && TOUCH_DRAG_STAGE_MODES.has(state.mode)) {
        startSingleTouch(event.clientX, event.clientY, { completeStageOnUp: true });
        return;
      }
    }

    if (touchSession.started) {
      routeSingleMove(makeTouchEvent(touchSession, event.clientX, event.clientY, 1));
    }
  }

  function onPointerUp(event) {
    lastPointerType = normalizePointerType(event.pointerType);
    const wasTouch = lastPointerType === "touch";
    if (wasTouch && isTouchActionTarget(event.target)) {
      queueTouchActionRefresh();
      return;
    }
    const snapshot = activePointers.get(event.pointerId) || pointerSnapshot(event);
    activePointers.delete(event.pointerId);
    if (!wasTouch) return;

    consumeTouchEvent(event);
    release(event.pointerId);

    if (navigationLock) {
      endNavigationIfFinished();
      return;
    }

    if (!touchSession || touchSession.pointerId !== event.pointerId) return;
    const upEvent = makeTouchEvent(snapshot, event.clientX, event.clientY, 0);
    if (!touchSession.started) {
      if (state.mode === "sam" && samNegativeArmed) addTouchSamNegative(snapshot, event.clientX, event.clientY);
      else {
        routeSingleDown(upEvent);
        routeSingleUp(upEvent);
      }
    } else {
      routeSingleMove(makeTouchEvent(snapshot, event.clientX, event.clientY, 1));
      if (touchSession.completeStageOnUp) routeSingleDown(upEvent);
      routeSingleUp(upEvent);
    }
    touchSession = null;
    queueTouchActionRefresh();
  }

  function onPointerCancel(event) {
    lastPointerType = normalizePointerType(event.pointerType);
    const wasTouch = lastPointerType === "touch";
    activePointers.delete(event.pointerId);
    if (!wasTouch) return;

    consumeTouchEvent(event);
    release(event.pointerId);
    if (touchSession?.pointerId === event.pointerId) {
      if (touchSession.started && state.mode === "pointer" && state.editing && typeof cancelPointerEdit === "function") cancelPointerEdit();
      else restoreDrawingSnapshot();
      if (state.mode === "sam" && state.sam?.drag) {
        state.sam.drag = null;
        if (typeof renderSamOverlay === "function") renderSamOverlay();
      }
      touchSession = null;
    }
    endNavigationIfFinished();
    queueTouchActionRefresh();
  }

  document.addEventListener("click", () => {
    if (seenTouch) queueTouchActionRefresh();
  });

  viewport.addEventListener("pointerdown", onPointerDown, { capture: true, passive: false });
  viewport.addEventListener("pointermove", onPointerMove, { capture: true, passive: false });
  viewport.addEventListener("pointerup", onPointerUp, { capture: true, passive: false });
  viewport.addEventListener("pointercancel", onPointerCancel, { capture: true, passive: false });
  viewport.addEventListener("lostpointercapture", event => {
    if (normalizePointerType(event.pointerType) !== "touch") return;
    if (!activePointers.has(event.pointerId)) return;
    onPointerCancel(event);
  }, { capture: true });

  window.helloLabelPointerInput = {
    profiles: PROFILES,
    touchToolPolicy: TOUCH_TOOL_POLICY,
    profileFor,
    normalizePointerType,
    capture,
    release,
    activePointers,
    get activePointerCount() {
      return activePointers.size;
    },
    get touchPointerCount() {
      return touchPointers().length;
    },
    refreshTouchActions,
    get samNegativeArmed() {
      return samNegativeArmed;
    },
    get navigationActive() {
      return navigationLock;
    },
    get lastPointerType() {
      return lastPointerType;
    },
  };
})();
