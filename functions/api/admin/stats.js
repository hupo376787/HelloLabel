const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS telemetry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    day TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    referrer_host TEXT,
    country TEXT,
    region TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    language TEXT,
    screen TEXT,
    app_version TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_sessions (
    session_id TEXT PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    first_seen INTEGER NOT NULL,
    last_seen INTEGER NOT NULL,
    first_day TEXT NOT NULL,
    last_path TEXT NOT NULL,
    country TEXT,
    region TEXT,
    browser TEXT,
    os TEXT,
    device TEXT,
    language TEXT,
    screen TEXT,
    app_version TEXT
  )`,
  `CREATE TABLE IF NOT EXISTS telemetry_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    day TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    action TEXT NOT NULL,
    label TEXT,
    app_version TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_ts ON telemetry_events(ts)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_day ON telemetry_events(day)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_visitor ON telemetry_events(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_session ON telemetry_events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_last_seen ON telemetry_sessions(last_seen)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_clicks_day ON telemetry_clicks(day)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_clicks_action ON telemetry_clicks(action)`,
];

async function initSchema(db) {
  const result = await db.prepare(`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name IN ('telemetry_events', 'telemetry_sessions', 'telemetry_clicks')
  `).all();
  const names = new Set((result.results || []).map(row => String(row.name || "")));
  if (!names.has("telemetry_events") || !names.has("telemetry_sessions") || !names.has("telemetry_clicks")) {
    await db.batch(SCHEMA.map(sql => db.prepare(sql)));
  }
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  return new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
}

async function secureEqual(a, b) {
  const [left, right] = await Promise.all([sha256(String(a || "")), sha256(String(b || ""))]);
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

function bearerToken(request) {
  const header = request.headers.get("Authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

async function topRows(db, sql, startDay) {
  const result = await db.prepare(sql).bind(startDay).all();
  return (result.results || []).map(row => ({
    label: String(row.label ?? "—"),
    value: Number(row.value || 0),
  }));
}

function number(value) {
  return Number(value || 0);
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };

  if (!env.ADMIN_TOKEN) {
    return Response.json({ error: "admin_token_not_configured" }, { status: 503, headers });
  }
  if (!env.TELEMETRY_DB) {
    return Response.json({ error: "telemetry_db_not_configured" }, { status: 503, headers });
  }

  const supplied = bearerToken(request);
  if (!supplied || !(await secureEqual(supplied, env.ADMIN_TOKEN))) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers });
  }

  try {
    const db = env.TELEMETRY_DB;
    await initSchema(db);

    const url = new URL(request.url);
    const requestedDays = Number.parseInt(url.searchParams.get("days") || "30", 10);
    const days = [7, 30, 90].includes(requestedDays) ? requestedDays : 30;
    const now = Date.now();
    const today = new Date(now).toISOString().slice(0, 10);
    const startDay = new Date(now - (days - 1) * 86400000).toISOString().slice(0, 10);
    const activeSince = now - 5 * 60 * 1000;

    const overview = await db.prepare(`
      SELECT
        COUNT(*) AS total_pv,
        COUNT(DISTINCT visitor_id) AS total_uv,
        SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS today_pv,
        COUNT(DISTINCT CASE WHEN day = ? THEN visitor_id END) AS today_uv,
        SUM(CASE WHEN day >= ? THEN 1 ELSE 0 END) AS period_pv,
        COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_id END) AS period_uv,
        COUNT(DISTINCT CASE WHEN day >= ? THEN session_id END) AS period_sessions
      FROM telemetry_events
    `).bind(today, today, startDay, startDay, startDay).first();

    const active = await db.prepare(`
      SELECT
        COUNT(*) AS active_sessions,
        COUNT(DISTINCT visitor_id) AS active_uv
      FROM telemetry_sessions
      WHERE last_seen >= ?
    `).bind(activeSince).first();

    const clickSummary = await db.prepare(`
      SELECT
        COUNT(*) AS total_clicks,
        SUM(CASE WHEN day = ? THEN 1 ELSE 0 END) AS today_clicks,
        SUM(CASE WHEN day >= ? THEN 1 ELSE 0 END) AS period_clicks,
        COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_id END) AS period_click_uv
      FROM telemetry_clicks
    `).bind(today, startDay, startDay).first();

    const clickRowsResult = await db.prepare(`
      SELECT
        action,
        COALESCE(NULLIF(label, ''), action) AS label,
        COUNT(*) AS value,
        COUNT(DISTINCT visitor_id) AS uv
      FROM telemetry_clicks
      WHERE day >= ?
      GROUP BY action, label
      ORDER BY value DESC, action ASC
      LIMIT 40
    `).bind(startDay).all();

    const dailyResult = await db.prepare(`
      SELECT day, COUNT(*) AS pv, COUNT(DISTINCT visitor_id) AS uv
      FROM telemetry_events
      WHERE day >= ?
      GROUP BY day
      ORDER BY day ASC
    `).bind(startDay).all();

    const countries = await topRows(db, `
      SELECT CASE WHEN country IS NULL OR country = '' THEN 'Unknown' ELSE country END AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 12
    `, startDay);
    const browsers = await topRows(db, `
      SELECT COALESCE(NULLIF(browser, ''), 'Other') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 8
    `, startDay);
    const operatingSystems = await topRows(db, `
      SELECT COALESCE(NULLIF(os, ''), 'Other') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 8
    `, startDay);
    const devices = await topRows(db, `
      SELECT COALESCE(NULLIF(device, ''), 'Other') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 8
    `, startDay);
    const referrers = await topRows(db, `
      SELECT CASE WHEN referrer_host IS NULL OR referrer_host = '' THEN 'Direct' ELSE referrer_host END AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 12
    `, startDay);
    const paths = await topRows(db, `
      SELECT COALESCE(NULLIF(path, ''), '/') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 12
    `, startDay);
    const screens = await topRows(db, `
      SELECT COALESCE(NULLIF(screen, ''), 'Unknown') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 10
    `, startDay);
    const versions = await topRows(db, `
      SELECT COALESCE(NULLIF(app_version, ''), 'Unknown') AS label, COUNT(*) AS value
      FROM telemetry_events WHERE day >= ? GROUP BY label ORDER BY value DESC LIMIT 10
    `, startDay);

    const recentResult = await db.prepare(`
      SELECT ts, path, referrer_host, country, region, browser, os, device, screen, app_version
      FROM telemetry_events
      ORDER BY ts DESC
      LIMIT 30
    `).all();

    return Response.json({
      generated_at: now,
      range_days: days,
      overview: {
        total_pv: number(overview?.total_pv),
        total_uv: number(overview?.total_uv),
        today_pv: number(overview?.today_pv),
        today_uv: number(overview?.today_uv),
        period_pv: number(overview?.period_pv),
        period_uv: number(overview?.period_uv),
        period_sessions: number(overview?.period_sessions),
        active_sessions: number(active?.active_sessions),
        active_uv: number(active?.active_uv),
      },
      clicks: {
        total_clicks: number(clickSummary?.total_clicks),
        today_clicks: number(clickSummary?.today_clicks),
        period_clicks: number(clickSummary?.period_clicks),
        period_click_uv: number(clickSummary?.period_click_uv),
      },
      daily: (dailyResult.results || []).map(row => ({
        day: String(row.day),
        pv: number(row.pv),
        uv: number(row.uv),
      })),
      dimensions: {
        button_clicks: (clickRowsResult.results || []).map(row => ({
          action: String(row.action || "button:unknown"),
          label: String(row.label || row.action || "button:unknown"),
          value: number(row.value),
          uv: number(row.uv),
        })),
        countries,
        browsers,
        operating_systems: operatingSystems,
        devices,
        referrers,
        paths,
        screens,
        versions,
      },
      recent: (recentResult.results || []).map(row => ({
        ts: number(row.ts),
        path: String(row.path || "/"),
        referrer_host: String(row.referrer_host || ""),
        country: String(row.country || ""),
        region: String(row.region || ""),
        browser: String(row.browser || "Other"),
        os: String(row.os || "Other"),
        device: String(row.device || "Other"),
        screen: String(row.screen || ""),
        app_version: String(row.app_version || ""),
      })),
    }, { headers });
  } catch (error) {
    console.error("HelloLabel telemetry stats failed", error);
    return Response.json({ error: "stats_failed" }, { status: 500, headers });
  }
}

export function onRequest() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
