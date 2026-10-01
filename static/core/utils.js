"use strict";

(() => {
  function deepClone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, char => ({
      "&":"&amp;",
      "<":"&lt;",
      ">":"&gt;",
      '"':"&quot;",
      "'":"&#39;"
    })[char]);
  }

  function stemOf(name) {
    const index = name.lastIndexOf(".");
    return index > 0 ? name.slice(0, index) : name;
  }

  function extOf(name) {
    const index = name.lastIndexOf(".");
    return index >= 0 ? name.slice(index).toLowerCase() : "";
  }

  function isImage(name) {
    return window.HelloLabelConstants.IMAGE_EXTS.includes(extOf(name));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function dist2(a, b) {
    const dx = a[0] - b[0], dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  function uid() {
    return globalThis.crypto?.randomUUID?.()
      || `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }

  function hashString(value) {
    let hash = 2166136261 >>> 0;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const k = n => (n + h / 30) % 12;
    const a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return `#${[f(0),f(8),f(4)].map(x => Math.round(255*x).toString(16).padStart(2,"0")).join("")}`;
  }

  function stableColor(label) {
    return hslToHex(hashString(label) % 360, 72, 55);
  }

  function hexToRgba(hex, alpha = 1) {
    const match = String(hex).match(/^#([0-9a-f]{6})$/i);
    if (!match) return [0.2,0.8,0.4,alpha];
    const number = parseInt(match[1], 16);
    return [
      ((number >> 16) & 255) / 255,
      ((number >> 8) & 255) / 255,
      (number & 255) / 255,
      alpha
    ];
  }

  window.HelloLabelUtils = {
    deepClone,
    escapeHtml,
    stemOf,
    extOf,
    isImage,
    clamp,
    dist2,
    uid,
    hashString,
    hslToHex,
    stableColor,
    hexToRgba
  };
})();
