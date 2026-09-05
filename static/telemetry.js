"use strict";

(() => {
  if (window.__helloLabelTelemetryLoaded) return;
  window.__helloLabelTelemetryLoaded = true;

  const state = {
    enabled: true,
    reason: "",
    started: false,
    lastKind: "",
    lastStatus: null,
    lastSentAt: null,
    lastError: "",
    clicksSent: 0,
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

  function clean(value, max = 120) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
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

  function payload(kind, extra = {}) {
    return {
      kind,
      visitor_id: visitorId,
      session_id: sessionId,
      path: location.pathname || "/",
      referrer_host: kind === "pageview" ? referrerHost() : "",
      language: (navigator.language || "").slice(0, 24),
      screen: `${screen.width || 0}x${screen.height || 0}`,
      app_version: appVersion,
      ...extra,
    };
  }

  async function send(kind, extra = {}) {
    if (document.visibilityState === "hidden" && kind === "heartbeat") return;
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload(kind, extra)),
        keepalive: true,
        credentials: "same-origin",
      });
      state.lastKind = kind;
      state.lastStatus = response.status;
      state.lastSentAt = Date.now();
      if (kind === "click" && response.ok) state.clicksSent += 1;
      if (!response.ok) {
        state.lastError = (await response.text()).slice(0, 300) || `HTTP ${response.status}`;
      } else {
        state.lastError = "";
      }
    } catch (error) {
      state.lastKind = kind;
      state.lastError = String(error?.message || error || "telemetry request failed");
    }
  }

  function buttonDescriptor(button) {
    const id = clean(button.id, 80);
    const command = clean(button.getAttribute("data-command"), 80);
    const telemetryAction = clean(button.getAttribute("data-telemetry-action"), 100);
    const i18n = clean(button.getAttribute("data-i18n"), 80);
    const i18nTitle = clean(button.getAttribute("data-i18n-title"), 80);
    const aria = clean(button.getAttribute("aria-label"), 100);
    const title = clean(button.getAttribute("title"), 100);
    const owner = button.parentElement?.closest?.("[id]");
    const ownerId = clean(owner?.id, 80);
    const stableClass = [...button.classList]
      .filter(name => !["active", "hidden", "disabled", "selected"].includes(name))
      .slice(0, 3)
      .join(".");

    let action = telemetryAction;
    if (!action && id) action = id;
    if (!action && command) action = `command:${command}`;
    if (!action && i18n) action = `i18n:${i18n}`;
    if (!action && i18nTitle) action = `i18n-title:${i18nTitle}`;
    if (!action && aria) action = `aria:${aria}`;
    if (!action && ownerId) action = `container:${ownerId}${stableClass ? `.${stableClass}` : ""}`;
    if (!action && stableClass) action = `class:${stableClass}`;
    if (!action) action = "button:unidentified";

    const label = clean(
      button.getAttribute("data-telemetry-label") ||
      aria || title || i18n || i18nTitle || command || id || action,
      100,
    );

    return { action: clean(action, 120), label };
  }

  function trackButtonClicks() {
    document.addEventListener("click", event => {
      const origin = event.target instanceof Element ? event.target : null;
      const button = origin?.closest?.("button");
      if (!button || button.disabled) return;
      const descriptor = buttonDescriptor(button);
      send("click", descriptor);
    }, { capture: true, passive: true });
  }

  function start() {
    if (state.started) return;
    state.started = true;
    send("pageview");
    trackButtonClicks();
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
