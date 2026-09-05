"use strict";

(() => {
  const TOKEN_KEY = "hellolabel-admin-token";
  const $ = id => document.getElementById(id);
  const summaryEl = $("annotationSummary");
  const barsEl = $("annotationBars");
  const rangeSelect = $("rangeSelect");
  const refreshBtn = $("refreshBtn");
  const loginForm = $("loginForm");
  if (!summaryEl || !barsEl || !rangeSelect) return;

  const LABELS = {
    pen: "画笔",
    polygon: "多边形",
    rectangle: "矩形",
    oriented_rectangle: "有向矩形",
    circle: "圆形",
    point: "点",
    line: "直线",
    linestrip: "折线",
    sam: "SAM AI 交互",
    "yolo11-detect": "YOLO11 Detect",
    "yolo11-seg": "YOLO11 Seg",
    "yolo-world": "YOLO-World",
  };

  let timer = null;

  function fmt(value) {
    return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
  }

  function token() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; }
  }

  function renderRows(rows = []) {
    barsEl.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "bar-empty";
      empty.textContent = "暂无成功创建标注的数据";
      barsEl.appendChild(empty);
      return;
    }

    const max = Math.max(...rows.map(row => Number(row.value || 0)), 1);
    for (const row of rows) {
      const raw = String(row.label || "Unknown");
      const display = LABELS[raw] ? `${LABELS[raw]} · ${raw}` : raw;
      const item = document.createElement("div");
      item.className = "bar-row";

      const meta = document.createElement("div");
      meta.className = "bar-meta";
      const label = document.createElement("span");
      label.className = "bar-label";
      label.title = display;
      label.textContent = display;
      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = `${fmt(row.value)} 次 · ${fmt(row.uv)} UV`;
      meta.append(label, value);

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, Number(row.value || 0) / max * 100)}%`;
      track.appendChild(fill);
      item.append(meta, track);
      barsEl.appendChild(item);
    }
  }

  async function load() {
    const auth = token();
    if (!auth) return;
    const days = rangeSelect.value;
    try {
      const response = await fetch(`/api/admin/annotations?days=${encodeURIComponent(days)}`, {
        headers: { Authorization: `Bearer ${auth}` },
        cache: "no-store",
        credentials: "same-origin",
      });
      if (!response.ok) return;
      const body = await response.json();
      const s = body.summary || {};
      summaryEl.textContent = `${body.range_days || days} 天共成功创建 ${fmt(s.period_creations)} 个标注 · ${fmt(s.period_uv)} 个匿名访客 · 今日 ${fmt(s.today_creations)} 个 · 累计 ${fmt(s.total_creations)} 个`;
      renderRows(body.tools || []);
    } catch {
      // Keep the main admin dashboard usable even if this optional panel fails.
    }
  }

  loginForm?.addEventListener("submit", () => setTimeout(load, 50));
  refreshBtn?.addEventListener("click", () => setTimeout(load, 50));
  rangeSelect.addEventListener("change", () => setTimeout(load, 50));
  window.addEventListener("pageshow", () => setTimeout(load, 50));

  timer = setInterval(load, 60000);
  window.addEventListener("pagehide", () => clearInterval(timer), { once: true });
  setTimeout(load, 100);
})();
