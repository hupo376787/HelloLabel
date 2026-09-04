"use strict";

(() => {
  if (location.pathname.startsWith("/admin")) return;
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) return;

  const API = "/api/telemetry";
  const VISITOR_KEY = "hellolabel-telemetry-visitor";
  const SESSION_KEY = "hellolabel-telemetry-session";
  const HEARTBEAT_MS = 120000;
  let appVersion = "2.1.0";
  let started = false;
  let heartbeatTimer = null;

  function randomId() {
    try {
      return crypto.randomUUID();
    } catch {
      const bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      return [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    }
  }

  function getStoredId(storage, key) {
    try {
      let value = storage.getItem(key);
      if (!value) {
        value = randomId();
        storage.setItem(key, value);
      }
      return value;
    } catch {
      return randomId();
    }
  }

  const visitorId = getStoredId(localStorage, VISITOR_KEY);
  const sessionId = getStoredId(sessionStorage, SESSION_KEY);

  function referrerHost() {
    if (!document.referrer) return "";
    try {
      const host = new URL(document.referrer).hostname;
      return host === location.hostname ? "" : host;
    } catch {
      return "";
    }
  }

  function payload(kind) {
    return {
      kind,
      visitor_id: visitorId,
      session_id: sessionId,
      path: location.pathname || "/",
      referrer_host: kind === "pageview" ? referrerHost() : "",
      language: (navigator.language || "").slice(0, 24),
      screen: `${screen.width || 0}x${screen.height || 0}`,
      app_version: appVersion,
    };
  }

  async function send(kind) {
    if (document.visibilityState === "hidden" && kind === "heartbeat") return;
    try {
      await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(kind)),
        keepalive: true,
        credentials: "same-origin",
      });
    } catch {
      // Telemetry must never interfere with annotation workflows.
    }
  }

  function start(detail) {
    if (started) return;
    started = true;
    if (detail?.version) appVersion = String(detail.version).slice(0, 32);
    send("pageview");
    heartbeatTimer = setInterval(() => send("heartbeat"), HEARTBEAT_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") send("heartbeat");
    });

    window.addEventListener("pagehide", () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    }, { once: true });
  }

  window.addEventListener("hellolabel:ready", event => start(event.detail), { once: true });

  // Defensive fallback for environments where the ready event has already fired.
  setTimeout(() => {
    if (document.documentElement.dataset.hellolabelRuntime === "browser-only") start({ version: "2.1.0" });
  }, 2500);
})();
