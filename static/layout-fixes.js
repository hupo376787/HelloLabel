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

    html.hellolabel-touch-mode button.tool {
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

    @media (max-width:768px) {
      html.hellolabel-mobile .app-grid {
        grid-template-columns:1fr;
      }

      html.hellolabel-mobile .sidebar,
      html.hellolabel-mobile .inspector {
        display:none;
      }

      html.hellolabel-mobile .toolbar-row {
        overflow-x:auto;
        scrollbar-width:none;
      }

      html.hellolabel-mobile .toolbar-row::-webkit-scrollbar {
        display:none;
      }

      html.hellolabel-mobile .topbar {
        height:72px;
        --header-h:72px;
        grid-template-columns:1fr;
        grid-template-rows:72px;
      }

      html.hellolabel-mobile .brand {
        display:none;
      }

      html.hellolabel-mobile .main-tools {
        position:fixed;
        left:8px;
        right:8px;
        bottom:max(10px,env(safe-area-inset-bottom));
        height:60px;
        z-index:50;
        border:1px solid var(--line);
        border-radius:18px;
        box-shadow:var(--shadow);
        background:color-mix(in srgb,var(--panel) 94%,transparent);
        backdrop-filter:blur(12px);
      }
    }

    @media (min-width:769px) and (max-width:1200px) {
      html.hellolabel-compact .app-grid {
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
    const coarse = window.matchMedia?.("(pointer: coarse)").matches;
    const noHover = window.matchMedia?.("(hover: none)").matches;
    const width = window.innerWidth;
    document.documentElement.classList.toggle("hellolabel-touch-mode", !!(coarse || noHover));
    document.documentElement.classList.toggle("hellolabel-mobile", width < 768);
    document.documentElement.classList.toggle("hellolabel-compact", width >= 768 && width < 1200);
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
