"use strict";

(() => {
  const importButton = document.getElementById("importLabelsBtn");
  const addLabelButton = document.getElementById("addLabelBtn");

  function updateImportButton() {
    if (!importButton) return;
    const english = state?.language === "en";
    const text = english ? "Import" : "导入";
    const title = english ? "Import labels" : "导入标签";

    // The importer used to be an icon-only button placed before Add. Keep the
    // same action, but present it as icon + text and place it to the right of Add.
    importButton.style.width = "";
    importButton.style.minWidth = "";
    importButton.style.padding = "";
    importButton.style.display = "inline-flex";
    importButton.style.alignItems = "center";
    importButton.style.justifyContent = "center";
    importButton.style.gap = "5px";
    importButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true" style="width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;flex:none">
        <path d="M12 3v11"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 16.5V20h14v-3.5"/>
      </svg>
      <span>${text}</span>`;
    importButton.title = title;
    importButton.setAttribute("aria-label", title);

    if (addLabelButton?.parentElement && importButton.previousElementSibling !== addLabelButton) {
      addLabelButton.insertAdjacentElement("afterend", importButton);
    }
  }

  updateImportButton();

  // Keep the dynamically created Import button bilingual when the application
  // language changes after this extension has loaded.
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

  let lastWidth = -1;
  let lastHeight = -1;

  function syncViewportGeometry(force = false) {
    const rect = viewport.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width || 1));
    const height = Math.max(1, Math.round(rect.height || 1));
    if (!force && width === lastWidth && height === lastHeight) return;
    lastWidth = width;
    lastHeight = height;

    // The side panels animate grid-template-columns for 200 ms. Previously the
    // overlay was resized only on the first animation frame. The SVG then kept an
    // old viewBox while its CSS width continued growing/shrinking, so the selected
    // outline and handles were stretched away from the image. Synchronize every
    // actual viewport-size change instead.
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
  window.addEventListener("resize", () => syncViewportGeometry(true), { passive: true });
  requestAnimationFrame(() => syncViewportGeometry(true));
})();
