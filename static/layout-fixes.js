"use strict";

(() => {
  const importButton = document.getElementById("importLabelsBtn");
  const addLabelButton = document.getElementById("addLabelBtn");

  function updateImportButton() {
    if (!importButton) return;
    const english = state?.language === "en";
    const text = english ? "Import" : "导入";
    const title = english ? "Import labels" : "导入标签";
    importButton.style.width = "";
    importButton.style.minWidth = "";
    importButton.style.padding = "";
    importButton.style.display = "inline-flex";
    importButton.style.alignItems = "center";
    importButton.style.justifyContent = "center";
    importButton.style.gap = "5px";
    importButton.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none"><path d="M12 3v11"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 16.5V20h14v-3.5"/></svg><span>${text}</span>`;
    importButton.title = title;
    importButton.setAttribute("aria-label", title);
    if (addLabelButton?.parentElement && importButton.previousElementSibling !== addLabelButton) {
      addLabelButton.insertAdjacentElement("afterend", importButton);
    }
  }

  updateImportButton();

  if (typeof applyLanguage === "function") {
    const previousApplyLanguage = applyLanguage;
    applyLanguage = function(...args) {
      const result = previousApplyLanguage(...args);
      updateImportButton();
      return result;
    };
  }

  const viewport = document.getElementById("viewport");
  const appGrid = document.getElementById("appGrid");
  if (!viewport) return;

  const touchStyle = document.createElement("style");
  touchStyle.textContent = `
    html.hellolabel-touch-mode .viewport,
    html.hellolabel-touch-mode .workspace-wrap {
      touch-action:none;
      user-select:none;
      overscroll-behavior:none;
    }

    html.hellolabel-touch-mode button.tool,
    html.hellolabel-touch-mode .main-tools button.icon-only,
    html.hellolabel-touch-mode .main-tools .settings-icon-btn {
      min-width:48px;
      min-height:44px;
    }

    html.hellolabel-touch-mode .control-handle {
      stroke-width:3;
    }

    html.hellolabel-touch-mode .touch-ui-hint {
      display:flex;
    }

    .touch-ui-hint {
      display:none;
      position:absolute;
      left:50%;
      bottom:76px;
      transform:translateX(-50%);
      z-index:15;
      padding:8px 14px;
      border-radius:999px;
      background:color-mix(in srgb,var(--panel) 92%,transparent);
      border:1px solid var(--line2);
      box-shadow:var(--shadow);
      pointer-events:none;
      font-size:13px;
      white-space:nowrap;
    }

    html.hellolabel-touch-layout {
      --header-h:64px!important;
    }

    html.hellolabel-touch-layout .topbar {
      height:64px!important;
      grid-template-columns:1fr!important;
      grid-template-rows:64px!important;
    }

    html.hellolabel-touch-layout .brand {
      display:none!important;
    }

    html.hellolabel-touch-layout .main-tools {
      grid-column:1!important;
      grid-row:1!important;
      min-width:0;
      padding:8px max(8px,env(safe-area-inset-left)) 8px max(8px,env(safe-area-inset-right));
      overflow-x:auto;
      overflow-y:hidden;
      flex-wrap:nowrap!important;
      scrollbar-width:none;
      border-bottom:1px solid var(--line);
      background:color-mix(in srgb,var(--panel) 96%,transparent);
    }

    html.hellolabel-touch-layout .main-tools::-webkit-scrollbar {
      display:none;
    }

    html.hellolabel-touch-layout .topbar>.ai-row {
      display:none!important;
    }

    html.hellolabel-touch-layout .app-grid {
      height:calc(100% - 64px)!important;
      grid-template-columns:minmax(0,1fr)!important;
    }

    html.hellolabel-touch-layout #appGrid>.sidebar,
    html.hellolabel-touch-layout #appGrid>.inspector {
      display:none!important;
    }

    html.hellolabel-touch-layout .side-collapse-btn {
      display:none!important;
    }

    html.hellolabel-touch-layout .main-tools #zoomOutBtn,
    html.hellolabel-touch-layout .main-tools #zoomInBtn,
    html.hellolabel-touch-layout .main-tools #zoomLabel,
    html.hellolabel-touch-layout .main-tools #actualBtn,
    html.hellolabel-touch-layout .main-tools .show-labels-toggle,
    html.hellolabel-touch-layout .main-tools .ai-toolbar-toggle {
      display:none!important;
    }

    html.hellolabel-touch-layout .workspace-wrap {
      min-width:0;
    }

    html.hellolabel-touch-layout .touch-ui-hint {
      bottom:72px;
      max-width:calc(100vw - 24px);
      overflow:hidden;
      text-overflow:ellipsis;
    }

    @media (max-width:700px) {
      html.hellolabel-touch-layout {
        --header-h:60px!important;
      }

      html.hellolabel-touch-layout .topbar {
        height:60px!important;
        grid-template-rows:60px!important;
      }

      html.hellolabel-touch-layout .app-grid {
        height:calc(100% - 60px)!important;
      }

      html.hellolabel-touch-layout .main-tools {
        padding-top:6px;
        padding-bottom:6px;
      }
    }

    @media (min-width:769px) and (max-width:1200px) {
      html.hellolabel-compact:not(.hellolabel-touch-layout) .app-grid {
        grid-template-columns:64px minmax(0,1fr) 280px;
      }
    }
  `;
  document.head.appendChild(touchStyle);

  const hint = document.createElement("div");
  hint.className = "touch-ui-hint";
  hint.textContent = "双指缩放/移动图片，单指进行标注";
  viewport.appendChild(hint);

  function updateResponsiveMode() {
    const coarse = !!window.matchMedia?.("(pointer: coarse)").matches;
    const noHover = !!window.matchMedia?.("(hover: none)").matches;
    const width = window.innerWidth;
    const height = window.innerHeight;
    const touchMode = coarse || noHover;
    const touchLayout = touchMode && (width <= 1280 || height <= 800);
    const root = document.documentElement;

    root.classList.toggle("hellolabel-touch-mode", touchMode);
    root.classList.toggle("hellolabel-touch-layout", touchLayout);
    root.classList.toggle("hellolabel-mobile", touchLayout && width < 768);
    root.classList.toggle("hellolabel-tablet-touch", touchLayout && width >= 768);
    root.classList.toggle("hellolabel-compact", !touchLayout && width >= 768 && width < 1200);

    window.dispatchEvent(new CustomEvent("hellolabel:responsive-layout", {
      detail:{ touchMode, touchLayout, width, height }
    }));
  }

  updateResponsiveMode();
  window.addEventListener("resize", updateResponsiveMode, { passive:true });

  let lastWidth = -1;
  let lastHeight = -1;

  function syncViewportGeometry(force = false) {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 1));
    const height = Math.max(1, Math.round(rect.height || 1));
    if (!force && width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;
    if (typeof resizeOverlay === "function") resizeOverlay();
    if (typeof scheduleViewportRender === "function") scheduleViewportRender();
  }

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver(() => syncViewportGeometry());
    observer.observe(viewport);
  }

  appGrid?.addEventListener("transitionend", event => {
    if (event.propertyName === "grid-template-columns") syncViewportGeometry(true);
  });

  window.addEventListener("resize", () => syncViewportGeometry(true), { passive:true });
  requestAnimationFrame(() => syncViewportGeometry(true));
})();
