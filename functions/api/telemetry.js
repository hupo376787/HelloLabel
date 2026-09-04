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
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_ts ON telemetry_events(ts)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_day ON telemetry_events(day)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_visitor ON telemetry_events(visitor_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_events_session ON telemetry_events(session_id)`,
  `CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_last_seen ON telemetry_sessions(last_seen)`,
];

function text(value, max = 120) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validId(value) {
  return typeof value === "string" && /^[A-Za-z0-9_-]{8,80}$/.test(value);
}

function parseUserAgent(ua) {
  const source = String(ua || "");
  const lower = source.toLowerCase();

  let browser = "Other";
  if (/edg\/[\d.]+/i.test(source)) browser = "Edge";
  else if (/opr\/[\d.]+/i.test(source) || /opera/i.test(source)) browser = "Opera";
  else if (/firefox\/[\d.]+/i.test(source)) browser = "Firefox";
  else if (/chrome\/[\d.]+/i.test(source) || /crios\/[\d.]+/i.test(source)) browser = "Chrome";
  else if (/safari\/[\d.]+/i.test(source) && /version\/[\d.]+/i.test(source)) browser = "Safari";

  let os = "Other";
  if (/windows nt/i.test(source)) os = "Windows";
  else if (/android/i.test(source)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(source)) os = "iOS";
  else if (/mac os x|macintosh/i.test(source)) os = "macOS";
  else if (/cros/i.test(source)) os = "ChromeOS";
  else if (/linux/i.test(source)) os = "Linux";

  let device = "Desktop";
  if (/ipad|tablet|kindle|silk/i.test(source)) device = "Tablet";
  else if (/mobile|iphone|ipod|android/i.test(source)) device = "Mobile";

  return { browser, os, device, isBot: /bot|crawler|spider|slurp|headless|preview/i.test(lower) };
}

async function initSchema(db) {
  await db.batch(SCHEMA.map(sql => db.prepare(sql)));
}

function makeStatements(db, data) {
  const session = db.prepare(`
    INSERT INTO telemetry_sessions (
      session_id, visitor_id, first_seen, last_seen, first_day, last_path,
      country, region, browser, os, device, language, screen, app_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(session_id) DO UPDATE SET
      visitor_id = excluded.visitor_id,
      last_seen = excluded.last_seen,
      last_path = excluded.last_path,
      country = excluded.country,
      region = excluded.region,
      browser = excluded.browser,
      os = excluded.os,
      device = excluded.device,
      language = excluded.language,
      screen = excluded.screen,
      app_version = excluded.app_version
  `).bind(
    data.sessionId, data.visitorId, data.now, data.now, data.day, data.path,
    data.country, data.region, data.browser, data.os, data.device,
    data.language, data.screen, data.appVersion,
  );

  if (data.kind !== "pageview") return [session];

  const event = db.prepare(`
    INSERT INTO telemetry_events (
      ts, day, visitor_id, session_id, path, referrer_host,
      country, region, browser, os, device, language, screen, app_version
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    data.now, data.day, data.visitorId, data.sessionId, data.path, data.referrerHost,
    data.country, data.region, data.browser, data.os, data.device,
    data.language, data.screen, data.appVersion,
  );

  return [session, event];
}

async function writeTelemetry(db, data) {
  try {
    await db.batch(makeStatements(db, data));
  } catch (error) {
    if (!/no such table/i.test(String(error?.message || error))) throw error;
    await initSchema(db);
    await db.batch(makeStatements(db, data));
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!env.TELEMETRY_DB) return new Response(null, { status: 204 });
  if (request.headers.get("Sec-GPC") === "1" || request.headers.get("DNT") === "1") {
    return new Response(null, { status: 204 });
  }

  const ua = request.headers.get("User-Agent") || "";
  const agent = parseUserAgent(ua);
  if (agent.isBot) return new Response(null, { status: 204 });

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }

  const kind = body?.kind === "heartbeat" ? "heartbeat" : body?.kind === "pageview" ? "pageview" : "";
  if (!kind || !validId(body?.visitor_id) || !validId(body?.session_id)) {
    return Response.json({ error: "invalid_payload" }, { status: 400 });
  }

  const path = text(body?.path, 180) || "/";
  if (!path.startsWith("/") || path.startsWith("/admin")) return new Response(null, { status: 204 });

  const now = Date.now();
  const cf = request.cf || {};
  const data = {
    kind,
    now,
    day: new Date(now).toISOString().slice(0, 10),
    visitorId: body.visitor_id,
    sessionId: body.session_id,
    path,
    referrerHost: text(body?.referrer_host, 120),
    country: text(cf.country || "", 8),
    region: text(cf.regionCode || cf.region || "", 64),
    browser: agent.browser,
    os: agent.os,
    device: agent.device,
    language: text(body?.language, 24),
    screen: text(body?.screen, 32),
    appVersion: text(body?.app_version, 32),
  };

  try {
    await writeTelemetry(env.TELEMETRY_DB, data);
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("HelloLabel telemetry write failed", error);
    // Fail open so analytics never breaks the application.
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  }
}

export function onRequest() {
  return new Response("Method Not Allowed", {
    status: 405,
    headers: { Allow: "POST", "Cache-Control": "no-store" },
  });
}
