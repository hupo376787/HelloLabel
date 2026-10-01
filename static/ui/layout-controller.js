"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function currentAiToolbarVisible() {
    try {
      const value = localStorage.getItem("hellolabel-ai-toolbar-visible")
        ?? localStorage.getItem("labelit-ai-toolbar-visible");
      return value !== "0";
    } catch {
      return true;
    }
  }

  function applyAiToolbarVisibility(visible, persist = true) {
    const {
      state, els, cancelSam,
      resizeOverlay, scheduleViewportRender, scheduleInstanceListRender
    } = c;

    visible = !!visible;
    state.aiToolbarVisible = visible;

    if (persist) {
      try { localStorage.setItem("hellolabel-ai-toolbar-visible", visible ? "1" : "0"); } catch {}
    }

    if (!visible && state.mode === "sam") cancelSam(false);
    document.documentElement.classList.toggle("ai-tools-hidden", !visible);
    els.aiToolbarToggle.checked = visible;

    requestAnimationFrame(() => {
      resizeOverlay();
      scheduleViewportRender();
      scheduleInstanceListRender();
    });
  }

  function currentPanelVisible(side) {
    try {
      const value = localStorage.getItem(`hellolabel-${side}-panel-visible`)
        ?? localStorage.getItem(`labelit-${side}-panel-visible`);
      return value !== "0";
    } catch {
      return true;
    }
  }

  function updatePanelToggleUi() {
    const { state, els } = c;
    if (!els.appGrid) return;

    const left = !!state.leftPanelVisible;
    const right = !!state.rightPanelVisible;
    els.appGrid.classList.toggle("left-collapsed", !left);
    els.appGrid.classList.toggle("right-collapsed", !right);

    if (els.leftSidebarToggle) {
      els.leftSidebarToggle.textContent = left ? "‹" : "›";
      els.leftSidebarToggle.setAttribute("aria-expanded", String(left));
    }
    if (els.rightSidebarToggle) {
      els.rightSidebarToggle.textContent = right ? "›" : "‹";
      els.rightSidebarToggle.setAttribute("aria-expanded", String(right));
    }
  }

  function applyPanelVisibility(side, visible, persist = true) {
    const { state, resizeOverlay, scheduleViewportRender, scheduleInstanceListRender } = c;
    visible = !!visible;

    if (side === "left") state.leftPanelVisible = visible;
    else state.rightPanelVisible = visible;

    if (persist) {
      try { localStorage.setItem(`hellolabel-${side}-panel-visible`, visible ? "1" : "0"); } catch {}
    }

    updatePanelToggleUi();
    requestAnimationFrame(() => {
      resizeOverlay();
      scheduleViewportRender();
      scheduleInstanceListRender();
    });
  }

  function togglePanel(side) {
    const { state } = c;
    applyPanelVisibility(side, side === "left" ? !state.leftPanelVisible : !state.rightPanelVisible);
  }

  function closeAppMenu() {
    const { els } = c;
    els.appMenu?.classList.add("hidden");
    els.appMenuBtn?.setAttribute("aria-expanded", "false");
    els.appMenu?.querySelectorAll(".menu-entry.open").forEach(entry => entry.classList.remove("open"));
  }

  function toggleAppMenu() {
    const { els } = c;
    if (!els.appMenu) return;
    const open = els.appMenu.classList.contains("hidden");
    if (open) {
      els.appMenu.classList.remove("hidden");
      els.appMenuBtn?.setAttribute("aria-expanded", "true");
    } else {
      closeAppMenu();
    }
  }

  const api = {
    configure,
    currentAiToolbarVisible,
    applyAiToolbarVisibility,
    currentPanelVisible,
    updatePanelToggleUi,
    applyPanelVisibility,
    togglePanel,
    closeAppMenu,
    toggleAppMenu
  };

  window.HelloLabelLayout = api;
})();
