"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function currentTheme() {
    try {
      return localStorage.getItem("hellolabel-theme")
        || localStorage.getItem("labelit-theme")
        || "system";
    } catch {
      return "system";
    }
  }

  function themeIconSvg(mode) {
    if (mode === "light") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/></svg>';
    }
    if (mode === "dark") {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.7 15.2A7.7 7.7 0 0 1 8.8 5.3 7.8 7.8 0 1 0 18.7 15.2Z"/></svg>';
    }
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 3.5a8.5 8.5 0 0 1 0 17"/></svg>';
  }

  function applyTheme(mode, persist = true) {
    const { state, els, t, buildLabelAtlas, scheduleViewportRender } = c;
    if (persist) {
      try { localStorage.setItem("hellolabel-theme", mode); } catch {}
    }

    const actual = mode === "system"
      ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark")
      : mode;

    document.documentElement.dataset.theme = actual;
    els.themeBtn.innerHTML = themeIconSvg(mode);

    const label = mode === "system"
      ? t("systemTheme")
      : mode === "light"
        ? t("lightTheme")
        : t("darkTheme");

    els.themeBtn.title = label;
    els.themeBtn.setAttribute("aria-label", label);

    if (state.data) {
      buildLabelAtlas();
      scheduleViewportRender();
    }
  }

  function cycleTheme() {
    const mode = currentTheme();
    applyTheme(mode === "system" ? "light" : mode === "light" ? "dark" : "system");
  }

  function applyLanguage(language, persist = true) {
    const {
      state, els, t, updateYoloUi,
      renderFileList, renderLabelList, rebuildInstanceList, updateSelectionPanel,
      setSaveState, setStatus
    } = c;
    const messages = window.HelloLabelI18nMessages || {};

    language = language === "en" ? "en" : "zh";
    state.language = language;

    if (persist) {
      try { localStorage.setItem("hellolabel-language", language); } catch {}
    }

    document.documentElement.lang = language === "en" ? "en" : "zh-CN";
    els.languageSelect.value = language;
    els.languageSelect.setAttribute(
      "aria-label",
      language === "en"
        ? "Interface language: English; click to switch to Chinese"
        : "界面语言：中文；点击切换 English"
    );

    document.querySelectorAll("[data-i18n]").forEach(element => {
      const key = element.dataset.i18n;
      if (messages[language]?.[key] != null) element.textContent = t(key);
    });

    document.querySelectorAll("[data-i18n-title]").forEach(element => {
      const key = element.dataset.i18nTitle;
      if (messages[language]?.[key] == null) return;
      const label = t(key);
      element.title = label;
      if (!element.matches("select,input")) element.setAttribute("aria-label", label);
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
      const key = element.dataset.i18nPlaceholder;
      if (messages[language]?.[key] != null) element.placeholder = t(key);
    });

    if (!state.dirHandle) els.folderName.textContent = t("noFolder");

    applyTheme(currentTheme(), false);
    updateYoloUi();
    renderFileList();
    renderLabelList();
    rebuildInstanceList();
    updateSelectionPanel();

    if (!state.data) {
      setSaveState(t("noFileOpen"));
      setStatus(t("waiting"));
    } else if (state.dirty) {
      setSaveState(t("unsaved"), "saving");
    } else {
      setSaveState(state.jsonHandle ? t("saved") : t("notCreatedJson"), state.jsonHandle ? "saved" : "");
    }
  }

  const api = {
    configure,
    applyLanguage,
    currentTheme,
    themeIconSvg,
    applyTheme,
    cycleTheme
  };

  window.HelloLabelLanguageTheme = api;
})();
