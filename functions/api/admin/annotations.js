const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS telemetry_annotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts INTEGER NOT NULL,
    day TEXT NOT NULL,
    visitor_id TEXT NOT NULL,
    session_id TEXT NOT NULL,
    path TEXT NOT NULL,
    tool TEXT NOT NULL,
    shape_type TEXT NOT NULL,
    source TEXT,
    count INTEGER NOT NULL DEFAULT 1,
    app_version TEXT
  )`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_annotations_day ON telemetry_annotations(day)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_annotations_tool ON telemetry_annotations(tool)`,
];

async function initSchema(db) {
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
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

function number(value) {
  return Number(value || 0);
}

async function grouped(db, field, startDay, limit = 20) {
  const allowed = new Set(["tool", "shape_type", "source"]);
  if (!allowed.has(field)) return [];
  const result = await db.prepare(`
    SELECT COALESCE(NULLIF(${field}, ''), 'Unknown') AS label,
           SUM(count) AS value,
           COUNT(DISTINCT visitor_id) AS uv
    FROM telemetry_annotations
    WHERE day >= ?
    GROUP BY label
    ORDER BY value DESC, label ASC
    LIMIT ${Math.max(1, Math.min(40, Number(limit) || 20))}
  `).bind(startDay).all();
  return (result.results || []).map(row => ({
    label: String(row.label || "Unknown"),
    value: number(row.value),
    uv: number(row.uv),
  }));
}

export async function onRequestGet(context) {
  const { request, env } = context;
  const headers = { "Cache-Control": "no-store", "Content-Type": "application/json; charset=utf-8" };

  if (!env.ADMIN_TOKEN) return Response.json({ error: "admin_token_not_configured" }, { status: 503, headers });
  if (!env.TELEMETRY_DB) return Response.json({ error: "telemetry_db_not_configured" }, { status: 503, headers });

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

    const summary = await db.prepare(`
      SELECT
        COALESCE(SUM(count), 0) AS total_creations,
        COALESCE(SUM(CASE WHEN day = ? THEN count ELSE 0 END), 0) AS today_creations,
        COALESCE(SUM(CASE WHEN day >= ? THEN count ELSE 0 END), 0) AS period_creations,
        COUNT(DISTINCT CASE WHEN day >= ? THEN visitor_id END) AS period_uv
      FROM telemetry_annotations
    `).bind(today, startDay, startDay).first();

    const [tools, shapes, sources] = await Promise.all([
      grouped(db, "tool", startDay, 30),
      grouped(db, "shape_type", startDay, 20),
      grouped(db, "source", startDay, 20),
    ]);

    return Response.json({
      generated_at: now,
      range_days: days,
      summary: {
        total_creations: number(summary?.total_creations),
        today_creations: number(summary?.today_creations),
        period_creations: number(summary?.period_creations),
        period_uv: number(summary?.period_uv),
      },
      tools,
      shapes,
      sources,
    }, { headers });
  } catch (error) {
    console.error("HelloLabel annotation telemetry stats failed", error);
    return Response.json({ error: "annotation_stats_failed" }, { status: 500, headers });
  }
}

export function onRequest() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "GET", "Cache-Control": "no-store" },
  });
}
