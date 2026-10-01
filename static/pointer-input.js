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
  let lastPointerType = "mouse";
  const activePointers = new Map();
  let touchSession = null;
  let navigation = null;
  let navigationLock = false;

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

  function makeTouchEvent(snapshot, clientX = snapshot.clientX, clientY = snapshot.clientY, buttons = 1) {
    return {
      pointerId: snapshot.pointerId,
      pointerType: "touch",
      isPrimary: snapshot.isPrimary,
      clientX,
      clientY,
      button: 0,
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

  function routeSingleDown(eventLike) {
    if (!state?.data) return false;
    if (typeof closeAppMenu === "function") closeAppMenu();
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
      drawingBefore: typeof deepClone === "function" ? deepClone(state?.drawing ?? null) : (state?.drawing ?? null),
    };
    capture(event);
  }

  function startSingleTouch(clientX, clientY) {
    if (!touchSession || touchSession.started) return;
    touchSession.started = true;
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
    activePointers.set(event.pointerId, pointerSnapshot(event));
    if (lastPointerType !== "touch") return;

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

    if (!touchSession.started && moved >= TOUCH_DRAG_THRESHOLD_PX &&
        (state.mode === "pointer" || state.mode === "pen" || state.mode === "sam")) {
      startSingleTouch(event.clientX, event.clientY);
      return;
    }

    if (touchSession.started) {
      routeSingleMove(makeTouchEvent(touchSession, event.clientX, event.clientY, 1));
    }
  }

  function onPointerUp(event) {
    lastPointerType = normalizePointerType(event.pointerType);
    const wasTouch = lastPointerType === "touch";
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
    if (!touchSession.started) {
      routeSingleDown(makeTouchEvent(snapshot, event.clientX, event.clientY, 0));
      routeSingleUp(makeTouchEvent(snapshot, event.clientX, event.clientY, 0));
    } else {
      routeSingleUp(makeTouchEvent(snapshot, event.clientX, event.clientY, 0));
    }
    touchSession = null;
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
  }

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
    get navigationActive() {
      return navigationLock;
    },
    get lastPointerType() {
      return lastPointerType;
    },
  };
})();
