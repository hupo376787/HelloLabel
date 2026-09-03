"use strict";

(() => {
  const pointKey = (x, y, stride) => y * stride + x;
  const keyPoint = (key, stride) => [key % stride, Math.floor(key / stride)];
  const pixelOn = (mask, width, height, x, y) => x >= 0 && x < width && y >= 0 && y < height && mask[y * width + x] > 0;

  function foregroundBounds(mask, width, height) {
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      const row = y * width;
      for (let x = 0; x < width; x++) {
        if (!mask[row + x]) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    return maxX >= minX ? { minX, minY, maxX, maxY } : null;
  }

  function pushEdge(adjacency, start, end) {
    let list = adjacency.get(start);
    if (!list) adjacency.set(start, list = []);
    list.push(end);
  }

  // Convert foreground pixels into directed cell-border edges. Following these
  // edges produces true mask contours instead of walking through interior mask
  // pixels, which avoids the self-crossing polygons the old neighbor tracer could
  // produce on concave masks.
  function maskLoops(mask, width, height) {
    const bounds = foregroundBounds(mask, width, height);
    if (!bounds) return [];
    const stride = width + 1;
    const adjacency = new Map();
    const { minX, minY, maxX, maxY } = bounds;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (!pixelOn(mask, width, height, x, y)) continue;
        if (!pixelOn(mask, width, height, x, y - 1)) pushEdge(adjacency, pointKey(x, y, stride), pointKey(x + 1, y, stride));
        if (!pixelOn(mask, width, height, x + 1, y)) pushEdge(adjacency, pointKey(x + 1, y, stride), pointKey(x + 1, y + 1, stride));
        if (!pixelOn(mask, width, height, x, y + 1)) pushEdge(adjacency, pointKey(x + 1, y + 1, stride), pointKey(x, y + 1, stride));
        if (!pixelOn(mask, width, height, x - 1, y)) pushEdge(adjacency, pointKey(x, y + 1, stride), pointKey(x, y, stride));
      }
    }

    const takeEdge = start => {
      const list = adjacency.get(start);
      if (!list?.length) return null;
      const end = list.pop();
      if (!list.length) adjacency.delete(start);
      return end;
    };

    const loops = [];
    while (adjacency.size) {
      const first = adjacency.keys().next().value;
      let current = first;
      const loop = [keyPoint(first, stride)];
      const maxSteps = Math.max(64, adjacency.size * 4 + 16);
      for (let step = 0; step < maxSteps; step++) {
        const next = takeEdge(current);
        if (next == null) break;
        current = next;
        if (current === first) break;
        loop.push(keyPoint(current, stride));
      }
      if (loop.length >= 3 && current === first) loops.push(loop);
    }
    return loops;
  }

  function signedArea(points) {
    let area = 0;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      area += points[j][0] * points[i][1] - points[i][0] * points[j][1];
    }
    return area / 2;
  }

  function pointInPolygon(point, polygon) {
    if (!point || !polygon?.length) return false;
    const [px, py] = point;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const [xi, yi] = polygon[i], [xj, yj] = polygon[j];
      const crosses = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / ((yj - yi) || Number.EPSILON) + xi);
      if (crosses) inside = !inside;
    }
    return inside;
  }

  function chooseOuterLoop(loops, anchor = null) {
    if (!loops.length) return [];
    const ranked = loops
      .map(points => ({ points, area: Math.abs(signedArea(points)) }))
      .filter(item => item.area > 0)
      .sort((a, b) => b.area - a.area);
    if (!ranked.length) return [];
    if (anchor) {
      const containing = ranked.filter(item => pointInPolygon(anchor, item.points));
      if (containing.length) return containing[0].points;
    }
    return ranked[0].points;
  }

  function fallbackRdp(points, epsilon) {
    if (points.length < 3) return points;
    const distToSegment = (p, a, b) => {
      const vx = b[0] - a[0], vy = b[1] - a[1];
      const wx = p[0] - a[0], wy = p[1] - a[1];
      const vv = vx * vx + vy * vy;
      const t = vv ? Math.max(0, Math.min(1, (wx * vx + wy * vy) / vv)) : 0;
      return Math.hypot(p[0] - (a[0] + vx * t), p[1] - (a[1] + vy * t));
    };
    let max = 0, index = -1;
    for (let i = 1; i < points.length - 1; i++) {
      const d = distToSegment(points[i], points[0], points.at(-1));
      if (d > max) { max = d; index = i; }
    }
    if (max <= epsilon || index < 0) return [points[0], points.at(-1)];
    return fallbackRdp(points.slice(0, index + 1), epsilon).slice(0, -1).concat(fallbackRdp(points.slice(index), epsilon));
  }

  function simplifyClosed(points, width, height) {
    if (points.length <= 12) return points;
    const epsilon = Math.max(0.8, Math.sqrt(width * height) / 1400);
    // Rotate the closed contour at a stable extreme point before applying RDP so
    // the artificial first/last seam does not create an oversized straight cut.
    let pivot = 0;
    for (let i = 1; i < points.length; i++) {
      if (points[i][0] < points[pivot][0] || (points[i][0] === points[pivot][0] && points[i][1] < points[pivot][1])) pivot = i;
    }
    const rotated = points.slice(pivot).concat(points.slice(0, pivot));
    const open = rotated.concat([rotated[0]]);
    const simplified = typeof rdp === "function" ? rdp(open, epsilon) : fallbackRdp(open, epsilon);
    if (simplified.length > 1 && simplified[0][0] === simplified.at(-1)[0] && simplified[0][1] === simplified.at(-1)[1]) simplified.pop();
    return simplified.length >= 3 ? simplified : points;
  }

  function boundsOf(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
  }

  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  function convexHull(points) {
    const pts = [...new Map(points.map(p => [`${p[0]},${p[1]}`, p])).values()].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (pts.length <= 2) return pts;
    const lower = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop(); lower.push(p); }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop(); upper.push(p); }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function minAreaRect(points) {
    const hull = convexHull(points);
    if (hull.length < 2) return null;
    let best = null;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const angle = -Math.atan2(b[1] - a[1], b[0] - a[0]);
      const c = Math.cos(angle), s = Math.sin(angle);
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of hull) {
        const x = p[0] * c - p[1] * s, y = p[0] * s + p[1] * c;
        minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
      }
      const area = (maxX - minX) * (maxY - minY);
      if (!best || area < best.area) best = { area, angle, minX, minY, maxX, maxY };
    }
    const c = Math.cos(-best.angle), s = Math.sin(-best.angle);
    const unrotate = ([x, y]) => [x * c - y * s, x * s + y * c];
    return [unrotate([best.minX, best.minY]), unrotate([best.maxX, best.minY]), unrotate([best.maxX, best.maxY]), unrotate([best.minX, best.maxY])];
  }

  const circle2 = (a, b) => { const x = (a[0] + b[0]) / 2, y = (a[1] + b[1]) / 2; return { x, y, r: Math.hypot(a[0] - x, a[1] - y) }; };
  function circle3(a, b, c) {
    const d = 2 * (a[0] * (b[1] - c[1]) + b[0] * (c[1] - a[1]) + c[0] * (a[1] - b[1]));
    if (Math.abs(d) < 1e-9) return null;
    const aa = a[0] ** 2 + a[1] ** 2, bb = b[0] ** 2 + b[1] ** 2, cc = c[0] ** 2 + c[1] ** 2;
    const x = (aa * (b[1] - c[1]) + bb * (c[1] - a[1]) + cc * (a[1] - b[1])) / d;
    const y = (aa * (c[0] - b[0]) + bb * (a[0] - c[0]) + cc * (b[0] - a[0])) / d;
    return { x, y, r: Math.hypot(a[0] - x, a[1] - y) };
  }
  const inCircle = (p, c) => !!c && Math.hypot(p[0] - c.x, p[1] - c.y) <= c.r + 1e-6;
  function minimumEnclosingCircle(points) {
    const pts = points.slice();
    // Deterministic pseudo-shuffle keeps output stable while avoiding pathological order.
    pts.sort((a, b) => ((a[0] * 73856093 + a[1] * 19349663) % 1000003) - ((b[0] * 73856093 + b[1] * 19349663) % 1000003));
    let c = null;
    for (let i = 0; i < pts.length; i++) {
      if (inCircle(pts[i], c)) continue;
      c = { x: pts[i][0], y: pts[i][1], r: 0 };
      for (let j = 0; j < i; j++) {
        if (inCircle(pts[j], c)) continue;
        c = circle2(pts[i], pts[j]);
        for (let k = 0; k < j; k++) if (!inCircle(pts[k], c)) c = circle3(pts[i], pts[j], pts[k]) || c;
      }
    }
    return c;
  }

  function geometryFromMask(mask, width, height, outputType, options = {}) {
    if (!(mask instanceof Uint8Array)) mask = new Uint8Array(mask || 0);
    const loops = maskLoops(mask, width, height);
    let boundary = chooseOuterLoop(loops, options.anchor || null);
    if (!boundary.length) throw new Error("AI returned an empty mask");
    boundary = simplifyClosed(boundary, width, height);
    if (outputType === "polygon") return boundary;
    const box = boundsOf(boundary);
    if (outputType === "rectangle") return [[box.minX, box.minY], [box.maxX, box.maxY]];
    if (outputType === "oriented_rectangle") return minAreaRect(boundary) || [[box.minX, box.minY], [box.maxX, box.minY], [box.maxX, box.maxY], [box.minX, box.maxY]];
    if (outputType === "circle") {
      const c = minimumEnclosingCircle(boundary);
      return c ? [[c.x, c.y], [c.x + c.r, c.y]] : [[(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2], [box.maxX, (box.minY + box.maxY) / 2]];
    }
    return boundary;
  }

  window.helloLabelMaskGeometry = { geometryFromMask, maskLoops, pointInPolygon };
})();
