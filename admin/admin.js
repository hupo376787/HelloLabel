"use strict";

(() => {
  const TOKEN_KEY = "hellolabel-admin-token";
  const $ = id => document.getElementById(id);
  const loginView = $("loginView");
  const dashboardView = $("dashboardView");
  const loginForm = $("loginForm");
  const tokenInput = $("tokenInput");
  const loginError = $("loginError");
  const logoutBtn = $("logoutBtn");
  const refreshBtn = $("refreshBtn");
  const rangeSelect = $("rangeSelect");
  const dashboardError = $("dashboardError");
  let token = "";
  let latestStats = null;
  let refreshTimer = null;

  function fmt(value) {
    return new Intl.NumberFormat("zh-CN").format(Number(value || 0));
  }

  function showLogin(message = "") {
    token = "";
    sessionStorage.removeItem(TOKEN_KEY);
    loginView.classList.remove("hidden");
    dashboardView.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    loginError.textContent = message;
    tokenInput.value = "";
    tokenInput.focus();
    if (refreshTimer) clearInterval(refreshTimer);
  }

  function showDashboard() {
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
  }

  function setError(message = "") {
    dashboardError.textContent = message;
    dashboardError.classList.toggle("hidden", !message);
  }

  async function fetchStats() {
    if (!token) return;
    refreshBtn.disabled = true;
    setError("");
    try {
      const days = rangeSelect.value;
      const response = await fetch(`/api/admin/stats?days=${encodeURIComponent(days)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        credentials: "same-origin",
      });

      if (response.status === 401) {
        showLogin("后台口令不正确，请重新输入。");
        return;
      }

      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (body.error === "telemetry_db_not_configured") {
          throw new Error("尚未绑定 Cloudflare D1 数据库 TELEMETRY_DB。请先在 Pages 项目设置中添加 D1 Binding，然后重新部署。");
        }
        if (body.error === "admin_token_not_configured") {
          throw new Error("尚未配置 ADMIN_TOKEN。请在 Pages → Settings → Variables and Secrets 中添加加密 Secret，然后重新部署。");
        }
        throw new Error(`统计接口请求失败（HTTP ${response.status}）。`);
      }

      latestStats = body;
      render(body);
    } catch (error) {
      setError(error?.message || String(error));
    } finally {
      refreshBtn.disabled = false;
    }
  }

  function render(stats) {
    const o = stats.overview || {};
    const days = Number(stats.range_days || 30);
    $("todayPv").textContent = fmt(o.today_pv);
    $("todayUv").textContent = fmt(o.today_uv);
    $("activeUv").textContent = fmt(o.active_uv);
    $("periodPv").textContent = fmt(o.period_pv);
    $("periodUv").textContent = fmt(o.period_uv);
    $("periodPvLabel").textContent = `${days} 天 PV`;
    $("periodUvLabel").textContent = `${days} 天 UV`;
    $("periodSessions").textContent = `${fmt(o.period_sessions)} 个会话 · 活跃会话 ${fmt(o.active_sessions)}`;
    $("totalPv").textContent = fmt(o.total_pv);
    $("totalUv").textContent = `累计 UV ${fmt(o.total_uv)}`;
    $("updatedAt").textContent = `最后更新：${new Date(stats.generated_at || Date.now()).toLocaleString("zh-CN")} · 日期按 UTC 聚合`;

    renderBars("countriesBars", stats.dimensions?.countries);
    renderBars("browsersBars", stats.dimensions?.browsers);
    renderBars("osBars", stats.dimensions?.operating_systems);
    renderBars("devicesBars", stats.dimensions?.devices);
    renderBars("referrersBars", stats.dimensions?.referrers);
    renderBars("pathsBars", stats.dimensions?.paths);
    renderBars("screensBars", stats.dimensions?.screens);
    renderBars("versionsBars", stats.dimensions?.versions);
    renderRecent(stats.recent || []);
    drawTrend(stats.daily || [], days);
  }

  function renderBars(id, rows = []) {
    const root = $(id);
    root.replaceChildren();
    if (!rows.length) {
      const empty = document.createElement("div");
      empty.className = "bar-empty";
      empty.textContent = "暂无数据";
      root.appendChild(empty);
      return;
    }

    const max = Math.max(...rows.map(row => Number(row.value || 0)), 1);
    for (const row of rows) {
      const item = document.createElement("div");
      item.className = "bar-row";

      const meta = document.createElement("div");
      meta.className = "bar-meta";
      const label = document.createElement("span");
      label.className = "bar-label";
      label.title = String(row.label || "—");
      label.textContent = String(row.label || "—");
      const value = document.createElement("span");
      value.className = "bar-value";
      value.textContent = fmt(row.value);
      meta.append(label, value);

      const track = document.createElement("div");
      track.className = "bar-track";
      const fill = document.createElement("div");
      fill.className = "bar-fill";
      fill.style.width = `${Math.max(2, Number(row.value || 0) / max * 100)}%`;
      track.appendChild(fill);
      item.append(meta, track);
      root.appendChild(item);
    }
  }

  function renderRecent(rows) {
    const body = $("recentBody");
    body.replaceChildren();
    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.className = "empty-row";
      const td = document.createElement("td");
      td.colSpan = 8;
      td.textContent = "暂无访问数据";
      tr.appendChild(td);
      body.appendChild(tr);
      return;
    }

    for (const row of rows) {
      const tr = document.createElement("tr");
      const values = [
        new Date(row.ts || 0).toLocaleString("zh-CN"),
        row.path || "/",
        [row.country, row.region].filter(Boolean).join(" / ") || "—",
        `${row.browser || "Other"} / ${row.os || "Other"}`,
        row.device || "Other",
        row.screen || "—",
        row.referrer_host || "Direct",
        row.app_version || "—",
      ];
      for (const value of values) {
        const td = document.createElement("td");
        td.textContent = String(value);
        tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }

  function filledDaily(rows, days) {
    const map = new Map(rows.map(row => [row.day, row]));
    const result = [];
    const now = Date.now();
    for (let i = days - 1; i >= 0; i -= 1) {
      const day = new Date(now - i * 86400000).toISOString().slice(0, 10);
      const row = map.get(day) || { day, pv: 0, uv: 0 };
      result.push({ day, pv: Number(row.pv || 0), uv: Number(row.uv || 0) });
    }
    return result;
  }

  function drawTrend(rows, days) {
    const canvas = $("trendCanvas");
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const css = getComputedStyle(document.documentElement);
    const accent = css.getPropertyValue("--accent").trim() || "#e31239";
    const blue = css.getPropertyValue("--blue").trim() || "#3b73f1";
    const line = css.getPropertyValue("--line").trim() || "#dfe5ee";
    const muted = css.getPropertyValue("--muted").trim() || "#6d7688";
    const data = filledDaily(rows, days);
    const max = Math.max(1, ...data.flatMap(item => [item.pv, item.uv]));

    const width = rect.width;
    const height = rect.height;
    const pad = { left: 42, right: 14, top: 12, bottom: 28 };
    const plotW = Math.max(1, width - pad.left - pad.right);
    const plotH = Math.max(1, height - pad.top - pad.bottom);

    ctx.clearRect(0, 0, width, height);
    ctx.lineWidth = 1;
    ctx.strokeStyle = line;
    ctx.fillStyle = muted;
    ctx.font = "10px system-ui, sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";

    for (let i = 0; i <= 4; i += 1) {
      const y = pad.top + plotH * i / 4;
      const value = Math.round(max * (1 - i / 4));
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(width - pad.right, y);
      ctx.stroke();
      ctx.fillText(String(value), pad.left - 8, y);
    }

    const xFor = index => data.length <= 1 ? pad.left : pad.left + plotW * index / (data.length - 1);
    const yFor = value => pad.top + plotH * (1 - Number(value || 0) / max);

    function series(field, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.lineCap = "round";
      ctx.beginPath();
      data.forEach((item, index) => {
        const x = xFor(index);
        const y = yFor(item[field]);
        if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    series("pv", accent);
    series("uv", blue);

    ctx.fillStyle = muted;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const labelCount = width < 620 ? 3 : 6;
    for (let i = 0; i < labelCount; i += 1) {
      const index = Math.round((data.length - 1) * i / Math.max(1, labelCount - 1));
      const item = data[index];
      ctx.fillText(item.day.slice(5), xFor(index), height - pad.bottom + 8);
    }
  }

  loginForm.addEventListener("submit", event => {
    event.preventDefault();
    const candidate = tokenInput.value.trim();
    if (!candidate) return;
    token = candidate;
    sessionStorage.setItem(TOKEN_KEY, token);
    loginError.textContent = "";
    showDashboard();
    fetchStats();
    if (refreshTimer) clearInterval(refreshTimer);
    refreshTimer = setInterval(fetchStats, 60000);
  });

  logoutBtn.addEventListener("click", () => showLogin());
  refreshBtn.addEventListener("click", fetchStats);
  rangeSelect.addEventListener("change", fetchStats);
  window.addEventListener("resize", () => {
    if (latestStats) drawTrend(latestStats.daily || [], Number(latestStats.range_days || 30));
  });

  try { token = sessionStorage.getItem(TOKEN_KEY) || ""; } catch { token = ""; }
  if (token) {
    showDashboard();
    fetchStats();
    refreshTimer = setInterval(fetchStats, 60000);
  } else {
    showLogin();
  }
})();
