"use strict";

(() => {
  const isEditable = element => element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element?.getAttribute?.("contenteditable") === "true";

  function repairFocus(element = null) {
    const target = element && element.isConnected
      ? element
      : els.modalBody?.querySelector?.('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]');

    const focusOnce = () => {
      try { window.focus(); } catch {}
      if (!target?.isConnected || target.disabled) return;
      try { target.focus({ preventScroll: true }); } catch {
        try { target.focus(); } catch {}
      }
    };

    requestAnimationFrame(focusOnce);
    setTimeout(focusOnce, 40);
    setTimeout(focusOnce, 120);
  }

  // Native alert() dialogs can leave the Electron renderer without a usable text
  // focus after they close on Windows. Keep all renderer notifications inside the
  // existing HTML modal system so focus never leaves Chromium/Electron's page.
  window.alert = function(message) {
    const text = String(message ?? "");
    void showModal({
      title: "HelloLabel",
      body: `<div style="line-height:1.65;white-space:pre-wrap">${escapeHtml(text)}</div>`,
      buttons: [{ label: t("ok"), value: "ok", className: "primary" }]
    });
  };

  const originalShowModal = showModal;
  showModal = function(options) {
    const promise = originalShowModal(options);
    repairFocus();
    return promise;
  };

  const originalCloseModal = closeModal;
  closeModal = function(value = null) {
    const result = originalCloseModal(value);
    // Re-activate the renderer after a modal closes. Do not force a particular
    // input here; the next user click will select the intended field normally.
    requestAnimationFrame(() => {
      try { window.focus(); } catch {}
    });
    return result;
  };

  // Keep keyboard shortcuts out of editable controls even if an extension later
  // adds a nested span/icon inside a contenteditable container.
  window.addEventListener("keydown", event => {
    const target = event.target instanceof Element
      ? event.target.closest('input, textarea, select, [contenteditable="true"]')
      : null;
    if (!target || !isEditable(target)) return;
    event.stopImmediatePropagation();
  }, true);

  // First-annotation label dialog: OK is disabled until a label has either been
  // selected or typed. This also prevents the global Enter handler from closing
  // an empty dialog because HTMLElement.click() does nothing on a disabled button.
  chooseLabelModal = async function() {
    const labels = [...document.querySelectorAll("#labelList [data-label]")]
      .map(row => String(row.dataset.label || "").trim())
      .filter(Boolean);

    const html = `<div>${escapeHtml(t("chooseOrCreateLabel"))}</div>` +
      `<div id="modalLabelList" class="modal-label-list">${labels.map(name =>
        `<div class="modal-label-option" data-label="${escapeHtml(name)}"><span class="dot" style="background:${labelColor(name)}"></span><span>${escapeHtml(name)}</span></div>`
      ).join("") || `<div class="muted">${escapeHtml(t("noLabelsYet"))}</div>`}</div>` +
      `<label>${escapeHtml(t("newLabel"))}<input id="modalNewLabel" type="text" placeholder="${escapeHtml(t("newLabelPlaceholder"))}" autocomplete="off" /></label>`;

    let picked = null;
    const promise = showModal({
      title: t("chooseLabel"),
      body: html,
      buttons: [
        { label: t("cancel"), value: null },
        { label: t("ok"), value: "ok", className: "primary" }
      ]
    });

    requestAnimationFrame(() => {
      const list = $("modalLabelList");
      const input = $("modalNewLabel");
      const okButton = [...els.modalActions.querySelectorAll("button")].at(-1);

      const updateOkState = () => {
        const typed = String(input?.value || "").trim();
        if (okButton) okButton.disabled = !(picked || typed);
      };

      const selectRow = row => {
        if (!row) return;
        picked = String(row.dataset.label || "").trim() || null;
        list?.querySelectorAll(".modal-label-option").forEach(item => item.classList.toggle("active", item === row));
        if (input) input.value = "";
        updateOkState();
      };

      list?.addEventListener("click", event => selectRow(event.target.closest("[data-label]")));
      list?.addEventListener("dblclick", event => {
        const row = event.target.closest("[data-label]");
        if (!row) return;
        selectRow(row);
        event.preventDefault();
        if (!okButton?.disabled) closeModal("ok");
      });

      input?.addEventListener("input", () => {
        picked = null;
        list?.querySelectorAll(".modal-label-option").forEach(item => item.classList.remove("active"));
        updateOkState();
      });

      updateOkState();
      repairFocus(input);
    });

    const result = await promise;
    if (result !== "ok") return null;
    const typed = String($("modalNewLabel")?.value || "").trim();
    return typed || picked || null;
  };

  if (typeof I18N !== "undefined") {
    if (I18N.zh) I18N.zh.invalidLabelme = "同名 JSON 不是 HelloLabel shape 格式。";
    if (I18N.en) I18N.en.invalidLabelme = "The same-name JSON is not in HelloLabel shape format.";
    try { applyLanguage(state.language, false); } catch {}
  }
})();
