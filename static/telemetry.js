"use strict";

(() => {
  if (window.__helloLabelTelemetryLoaded) return;
  window.__helloLabelTelemetryLoaded = true;

  const state = {
    enabled: true,
    reason: "",
    started: false,
    lastStatus: null,
    lastSentAt: null,
    lastError: "",
  };
  window.helloLabelTelemetry = state;

  if (location.pathname.startsWith("/admin")) {
    state.enabled = false;
    state.reason = "admin";
    return;
  }
  if (navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true) {
    state.enabled = false;
    state.reason = "privacy-control";
    return;
  }

  const API = "/api/telemetry";
  const VISITOR_KEY = "hellolabel-telemetry-visitor";
  const SESSION_KEY = "hellolabel-telemetry-session";
  const HEARTBEAT_MS = 120000;
  let appVersion = "2.1.0";
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
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(kind)),
        keepalive: true,
        credentials: "same-origin",
      });
      state.lastStatus = response.status;
      state.lastSentAt = Date.now();
      if (!response.ok) {
        state.lastError = (await response.text()).slice(0, 300) || `HTTP ${response.status}`;
      } else {
        state.lastError = "";
      }
    } catch (error) {
      state.lastError = String(error?.message || error || "telemetry request failed");
    }
  }

  function start() {
    if (state.started) return;
    state.started = true;
    send("pageview");
    heartbeatTimer = setInterval(() => send("heartbeat"), HEARTBEAT_MS);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") send("heartbeat");
    });

    window.addEventListener("pagehide", () => {
      if (heartbeatTimer) clearInterval(heartbeatTimer);
    }, { once: true });
  }

  // Start immediately. Telemetry does not depend on annotation runtime readiness.
  start();

  window.addEventListener("hellolabel:ready", event => {
    if (event.detail?.version) appVersion = String(event.detail.version).slice(0, 32);
  }, { once: true });
})();
