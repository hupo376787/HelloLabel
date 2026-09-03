"use strict";

(() => {
  const CACHE_NAME = "hellolabel-browser-models-v1";
  const MODEL_HOSTS = new Set(["huggingface.co", "cdn-lfs.huggingface.co", "cas-bridge.xethub.hf.co"]);
  const previousFetch = window.fetch.bind(window);

  if (window.helloLabelBrowserRuntime) {
    window.helloLabelBrowserRuntime.modelCache = CACHE_NAME;
  }

  function cacheable(input, init) {
    if (!("caches" in window)) return false;
    const method = String(init?.method || (input instanceof Request ? input.method : "GET") || "GET").toUpperCase();
    if (method !== "GET") return false;
    try {
      const url = new URL(typeof input === "string" ? input : input.url, location.href);
      if (!MODEL_HOSTS.has(url.hostname)) return false;
      const pathname = url.pathname.toLowerCase();
      return pathname.includes("/resolve/") && (pathname.endsWith(".onnx") || pathname.includes(".onnx?") || pathname.endsWith(".bin") || pathname.endsWith(".json"));
    } catch {
      return false;
    }
  }

  window.fetch = async function(input, init) {
    if (!cacheable(input, init)) return previousFetch(input, init);
    const request = input instanceof Request ? input : new Request(input, init);
    try {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request, { ignoreVary: false });
      if (cached) return cached.clone();
      const response = await previousFetch(request);
      if (response.ok && (response.type === "basic" || response.type === "cors" || response.type === "default")) {
        try { await cache.put(request, response.clone()); } catch (error) { console.warn("HelloLabel model cache write failed", error); }
      }
      return response;
    } catch (error) {
      console.warn("HelloLabel model cache fallback", error);
      return previousFetch(input, init);
    }
  };
})();
