"use strict";

(() => {
  const runtime = window.helloLabelBrowserRuntime;
  if (!runtime) return;

  runtime.secureContext = window.isSecureContext === true;
  runtime.fileSystemAccess = typeof window.showDirectoryPicker === "function";
  runtime.crossOriginIsolated = window.crossOriginIsolated === true;

  function isLegacyApiTarget(value) {
    try {
      const raw = typeof value === "string" ? value : value?.url;
      if (!raw) return false;
      const url = new URL(raw, location.href);
      return url.origin === location.origin && (url.pathname === "/api" || url.pathname.startsWith("/api/"));
    } catch {
      return false;
    }
  }

  const blockedError = target => new Error(`HelloLabel 1.5 is browser-only; legacy server API blocked: ${String(typeof target === "string" ? target : target?.url || target)}`);

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
    imageUploadDisabled: true,
  };
})();
