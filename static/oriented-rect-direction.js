"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  const interactionSvg = document.getElementById("interactionSvg");
  if (!viewport || !interactionSvg) return;

  const canvas = document.createElement("canvas");
  canvas.id = "orientedRectDirectionCanvas";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.zIndex = "2";
  viewport.insertBefore(canvas, interactionSvg);

  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) {
    canvas.remove();
    return;
  }

  let renderRaf = 0;

  function ensureCanvasSize() {
    const rect = viewport.getBoundingClientRect();
    const dpr = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    canvas.style.width = `${Math.max(0, rect.width)}px`;
    canvas.style.height = `${Math.max(0, rect.height)}px`;
    return { width: rect.width, height: rect.height, dpr };
  }

  function arrowForPoints(points) {
    if (!Array.isArray(points) || points.length !== 4) return null;
    const screen = points.map(point => imageToViewport(Number(point[0]), Number(point[1])));
    if (screen.some(point => !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) return null;

    // For a Labelme-style oriented rectangle, p0-p1 is the first edge drawn by
    // the user and p2-p3 is the opposite edge created when width is chosen.
    // Direction therefore means "from the first edge to the second edge", not
    // along the first edge itself.
    const firstMidpoint = [
      (screen[0][0] + screen[1][0]) / 2,
      (screen[0][1] + screen[1][1]) / 2,
    ];
    const secondMidpoint = [
      (screen[2][0] + screen[3][0]) / 2,
      (screen[2][1] + screen[3][1]) / 2,
    ];
    const center = [
      (firstMidpoint[0] + secondMidpoint[0]) / 2,
      (firstMidpoint[1] + secondMidpoint[1]) / 2,
    ];

    const dx = secondMidpoint[0] - firstMidpoint[0];
    const dy = secondMidpoint[1] - firstMidpoint[1];
    const widthDistance = Math.hypot(dx, dy);
    if (widthDistance < 7) return null;

    const ux = dx / widthDistance;
    const uy = dy / widthDistance;
    const px = -uy;
    const py = ux;

    // The direction arrow is centered inside the OBB and its total shaft length
    // is exactly one quarter of the distance between the first and second edges.
    const shaftLength = widthDistance * 0.25;
    if (shaftLength < 3) return null;
    const half = shaftLength * 0.5;
    const start = [
      center[0] - ux * half,
      center[1] - uy * half,
    ];
    const end = [
      center[0] + ux * half,
      center[1] + uy * half,
    ];

    const head = Math.max(3, Math.min(10, shaftLength * 0.32));
    const wing = head * 0.62;
    const left = [end[0] - ux * head + px * wing, end[1] - uy * head + py * wing];
    const right = [end[0] - ux * head - px * wing, end[1] - uy * head - py * wing];

    return { center, firstMidpoint, secondMidpoint, start, end, left, right };
  }

  function traceArrow(arrow) {
    ctx.beginPath();
    ctx.moveTo(arrow.start[0], arrow.start[1]);
    ctx.lineTo(arrow.end[0], arrow.end[1]);
    ctx.moveTo(arrow.left[0], arrow.left[1]);
    ctx.lineTo(arrow.end[0], arrow.end[1]);
    ctx.lineTo(arrow.right[0], arrow.right[1]);
  }

  function drawArrow(points, color, alpha = 1) {
    const arrow = arrowForPoints(points);
    if (!arrow) return;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // A thin white halo plus a soft dark shadow keeps the direction readable on
    // both bright microscopy images and dark photographs without changing the
    // annotation color itself.
    traceArrow(arrow);
    ctx.strokeStyle = "rgba(255,255,255,.92)";
    ctx.lineWidth = 4.8;
    ctx.shadowColor = "rgba(0,0,0,.72)";
    ctx.shadowBlur = 3;
    ctx.stroke();

    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    traceArrow(arrow);
    ctx.strokeStyle = color || "#ffd54f";
    ctx.lineWidth = 2.35;
    ctx.stroke();
    ctx.restore();
  }

  function renderDirectionOverlay() {
    renderRaf = 0;
    const { width, height, dpr } = ensureCanvasSize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (width <= 0 || height <= 0 || !state?.data) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    for (const shape of state.data.shapes || []) {
      if (shape?.shape_type !== "oriented_rectangle") continue;
      drawArrow(shape.points, labelColor(shape.label));
    }

    // Show the same first-edge -> second-edge cue while the user is choosing
    // OBB width, so the final direction is visible before the third click.
    const draft = typeof currentDrawingShape === "function" ? currentDrawingShape() : null;
    if (draft?.shape_type === "oriented_rectangle") {
      const previewColor = getComputedStyle(document.documentElement).getPropertyValue("--selection").trim() || "#ffd54f";
      drawArrow(draft.points, previewColor, 0.98);
    }
  }

  function scheduleDirectionRender() {
    if (renderRaf) return;
    renderRaf = requestAnimationFrame(renderDirectionOverlay);
  }

  function clearDirectionOverlay() {
    if (renderRaf) {
      cancelAnimationFrame(renderRaf);
      renderRaf = 0;
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  const originalApplyTransformNow = applyTransformNow;
  applyTransformNow = function() {
    const result = originalApplyTransformNow.apply(this, arguments);
    scheduleDirectionRender();
    return result;
  };

  const originalRenderDrawingOverlay = renderDrawingOverlay;
  renderDrawingOverlay = function() {
    const result = originalRenderDrawingOverlay.apply(this, arguments);
    scheduleDirectionRender();
    return result;
  };

  const originalRenderAll = renderAll;
  renderAll = function() {
    const result = originalRenderAll.apply(this, arguments);
    scheduleDirectionRender();
    return result;
  };

  const originalResetCurrentState = resetCurrentState;
  resetCurrentState = function() {
    clearDirectionOverlay();
    return originalResetCurrentState.apply(this, arguments);
  };

  // Expose only the pure geometry result for acceptance/debug checks. The JSON
  // representation itself is intentionally untouched and remains Labelme-style.
  window.helloLabelOrientedRectDirection = Object.freeze({
    arrowForPoints,
    render: scheduleDirectionRender,
  });

  scheduleDirectionRender();
})();
