"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  if (!runtime) return;

  runtime.secureContext = window.isSecureContext === true;
  runtime.fileSystemAccess = typeof window.showDirectoryPicker === "function";
  runtime.crossOriginIsolated = window.crossOriginIsolated === true;

  const ALLOWED_SAME_ORIGIN_API_PATHS = new Set([
    "/api/telemetry",
  ]);

  function targetUrl(value) {
    try {
      const raw = typeof value === "string" ? value : value?.url;
      return raw ? new URL(raw, location.href) : null;
    } catch {
      return null;
    }
  }

  function isAllowedApiTarget(value) {
    const url = targetUrl(value);
    return !!url && url.origin === location.origin && ALLOWED_SAME_ORIGIN_API_PATHS.has(url.pathname);
  }

  function isLegacyApiTarget(value) {
    const url = targetUrl(value);
    if (!url || url.origin !== location.origin) return false;
    if (isAllowedApiTarget(url.href)) return false;
    return url.pathname === "/api" || url.pathname.startsWith("/api/");
  }

  const blockedError = target => new Error(`HelloLabel 2.1 is browser-only; legacy server API blocked: ${String(typeof target === "string" ? target : target?.url || target)}`);

  const previousFetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    if (isLegacyApiTarget(input)) return Promise.reject(blockedError(input));
    return previousFetch(input, init);
  };

  if (window.XMLHttpRequest?.prototype?.open) {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url, ...rest) {
      if (isLegacyApiTarget(url)) throw blockedError(url);
      return originalOpen.call(this, method, url, ...rest);
    };
  }

  if (navigator.sendBeacon) {
    const originalBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = function(url, data) {
      if (isLegacyApiTarget(url)) {
        console.warn("HelloLabel blocked legacy API beacon", url);
        return false;
      }
      return originalBeacon(url, data);
    };
  }

  window.helloLabelPrivacyGuard = {
    isLegacyApiTarget,
    isAllowedApiTarget,
    imageUploadDisabled: true,
  };
})();
