"use strict";

(() => {
  let context = null;

  function configure(nextContext) {
    context = nextContext || null;
    return api;
  }

  function dist2(a, b) {
    const dx = Number(a[0]) - Number(b[0]);
    const dy = Number(a[1]) - Number(b[1]);
    return dx * dx + dy * dy;
  }

  function pointSegDistance(p, a, b) {
    const vx = b[0] - a[0], vy = b[1] - a[1];
    const wx = p[0] - a[0], wy = p[1] - a[1];
    const vv = vx * vx + vy * vy;
    if (vv <= 1e-12) return Math.hypot(wx, wy);
    const u = Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv));
    return Math.hypot(p[0] - (a[0] + u * vx), p[1] - (a[1] + u * vy));
  }

  function rdp(points, eps) {
    if (points.length < 3) return points;
    let maxD = 0, index = 0;
    const a = points[0], b = points.at(-1);
    for (let i = 1; i < points.length - 1; i++) {
      const d = pointSegDistance(points[i], a, b);
      if (d > maxD) { maxD = d; index = i; }
    }
    if (maxD <= eps) return [a, b];
    const left = rdp(points.slice(0, index + 1), eps);
    const right = rdp(points.slice(index), eps);
    return left.slice(0, -1).concat(right);
  }

  function simplify(points, scale) {
    if (points.length < 4) return points;
    const min = Math.max(.6, 1.2 / scale), out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (dist2(points[i], out.at(-1)) >= min * min) out.push(points[i]);
    }
    const simplified = rdp(out, Math.max(.45, .85 / scale));
    return simplified.length >= 3 ? simplified : out;
  }

  function pointerDown(point) {
    if (!context) return false;
    const { state, setStatus, t } = context;
    if (!state.drawing) {
      state.drawing = { type: "pen", points: [point], cursor: point };
      setStatus(t("penHint"));
      window.HelloLabelDrawingState?.brush?.("drawing");
    }
    return true;
  }

  function pointerMove(point) {
    if (!context) return false;
    const { state, renderDrawingOverlay, finishSequenceDrawing } = context;
    const drawing = state.drawing;
    if (!drawing || drawing.type !== "pen") return false;

    drawing.cursor = point;
    const last = drawing.points.at(-1), minScreen = 2.3;
    if (Math.sqrt(dist2(last, point)) * state.scale >= minScreen) drawing.points.push(point);

    if (drawing.points.length >= 12) {
      const first = drawing.points[0];
      const screenDist = Math.sqrt(dist2(first, point)) * state.scale;
      if (screenDist <= 11) {
        void finishSequenceDrawing();
        return true;
      }
    }

    renderDrawingOverlay();
    return true;
  }

  function finalize(points, scale) {
    return simplify(points, scale);
  }

  function completed() {
    window.HelloLabelDrawingState?.brush?.("completed");
    window.HelloLabelDrawingState?.idle?.();
  }

  const api = { configure, pointerDown, pointerMove, finalize, completed };
  window.HelloLabelBrushTool = api;
})();
