"use strict";

// Mobile touch UI layer foundation.
// Keeps drawing core untouched and only manages touch-oriented UI helpers.
(() => {
  function initMobileTouchUI() {
    const root = document.documentElement;
    const viewport = document.getElementById("viewport");
    if (!viewport) return;

    const style = document.createElement("style");
    style.textContent = `
      .mobile-touch-action-bar {
        display:none;
      }

      html.hellolabel-mobile .mobile-touch-action-bar {
        display:flex;
        position:fixed;
        left:12px;
        right:12px;
        bottom:max(12px,env(safe-area-inset-bottom));
        z-index:80;
        min-height:52px;
        border-radius:18px;
        padding:8px;
        gap:8px;
        overflow-x:auto;
        background:color-mix(in srgb,var(--panel) 94%,transparent);
        border:1px solid var(--line);
        box-shadow:var(--shadow);
        backdrop-filter:blur(12px);
      }

      html.hellolabel-mobile .mobile-touch-action-bar button {
        min-width:48px;
        min-height:42px;
      }

      .touch-crosshair {
        display:none;
        position:absolute;
        width:32px;
        height:32px;
        margin:-16px;
        pointer-events:none;
        z-index:40;
      }

      html.hellolabel-touch-mode .touch-crosshair.active {
        display:block;
      }

      .touch-crosshair::before,
      .touch-crosshair::after {
        content:"";
        position:absolute;
        background:#fff;
        box-shadow:0 0 4px #000;
      }

      .touch-crosshair::before {
        left:15px;
        top:0;
        width:2px;
        height:32px;
      }

      .touch-crosshair::after {
        left:0;
        top:15px;
        width:32px;
        height:2px;
      }
    `;
    document.head.appendChild(style);

    const bar = document.createElement("div");
    bar.className = "mobile-touch-action-bar";
    bar.innerHTML = `
      <button data-touch-action="undo">↶</button>
      <button data-touch-action="finish">✓</button>
      <button data-touch-action="cancel">×</button>
    `;
    document.body.appendChild(bar);

    const cross = document.createElement("div");
    cross.className = "touch-crosshair";
    viewport.appendChild(cross);

    viewport.addEventListener("pointermove", event => {
      if (event.pointerType !== "touch") return;
      cross.style.left = `${event.clientX - viewport.getBoundingClientRect().left}px`;
      cross.style.top = `${event.clientY - viewport.getBoundingClientRect().top}px`;
      cross.classList.add("active");
    }, { passive:true });

    viewport.addEventListener("pointerleave", event => {
      if (event.pointerType === "touch") cross.classList.remove("active");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initMobileTouchUI, { once:true });
  } else {
    initMobileTouchUI();
  }
})();
