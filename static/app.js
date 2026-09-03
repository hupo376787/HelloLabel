"use strict";

(() => {
  const VERSION = "hellolabel-v150";
  const styles = [
    `/static/theme-workspace.css?v=${VERSION}`,
    `/static/about-ui.css?v=${VERSION}`,
  ];
  const scripts = [
    `/static/app-core.js?v=${VERSION}`,
    `/static/global-labels.js?v=${VERSION}`,
    `/static/browser-capture.js?v=${VERSION}`,
    `/static/browser-runtime.js?v=${VERSION}`,
    `/static/browser-model-cache.js?v=${VERSION}`,
    `/static/browser-mask-geometry.js?v=${VERSION}`,
    `/static/browser-sam-runtime.js?v=${VERSION}`,
    `/static/browser-yolo-runtime.js?v=${VERSION}`,
    `/static/browser-privacy-guard.js?v=${VERSION}`,
    `/static/browser-runtime-ui.js?v=${VERSION}`,
    `/static/browser-event-rebind.js?v=${VERSION}`,
    `/static/modal-focus-fix.js?v=${VERSION}`,
    `/static/layout-fixes.js?v=${VERSION}`,
    `/static/hover.js?v=${VERSION}`,
    `/static/workspace-ui.js?v=${VERSION}`,
    `/static/instance-delete.js?v=${VERSION}`,
    `/static/drawing-undo.js?v=${VERSION}`,
    `/static/geometry-edit.js?v=${VERSION}`,
    `/static/polygon-snap-visual.js?v=${VERSION}`,
    `/static/rectangle-crosshair.js?v=${VERSION}`,
    `/static/about-ui.js?v=${VERSION}`,
  ];

  for (const href of styles) {
    if ([...document.styleSheets].some(sheet => sheet.href === new URL(href, location.href).href)) continue;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${src}`)), { once: true });
      document.body.appendChild(script);
    });
  }

  (async () => {
    for (const src of scripts) await loadScript(src);
    document.documentElement.dataset.hellolabelRuntime = "browser-only";
    window.dispatchEvent(new CustomEvent("hellolabel:ready", { detail: { version: "1.5.0", runtime: "browser-only" } }));
  })().catch(error => {
    console.error("HelloLabel bootstrap failed", error);
    const pre = document.createElement("pre");
    pre.style.cssText = "position:fixed;inset:24px;z-index:99999;padding:18px;overflow:auto;background:#241c20;color:#ffd7df;border-radius:12px;white-space:pre-wrap";
    pre.textContent = `HelloLabel failed to load.\n\n${error?.stack || error}`;
    document.body.appendChild(pre);
  });
})();
