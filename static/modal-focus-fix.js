"use strict";

(() => {
  function repairFocus(element = null) {
    const target = element && element.isConnected
      ? element
      : els.modalBody?.querySelector?.('input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [contenteditable="true"]');

    const focusOnce = () => {
      try { window.focus(); } catch {}
      if (!target?.isConnected || target.disabled || target.getClientRects().length === 0) return;
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

  const originalShowModal = window.HelloLabelModal.showModal.bind(window.HelloLabelModal);
  window.HelloLabelModal.showModal = function(options) {
    const promise = originalShowModal(options);
    repairFocus();
    return promise;
  };

  const originalCloseModal = window.HelloLabelModal.closeModal.bind(window.HelloLabelModal);
  window.HelloLabelModal.closeModal = function(value = null) {
    const result = originalCloseModal(value);
    // Re-activate the renderer after a modal closes. Do not force a particular
    // input here; the next user click will select the intended field normally.
    requestAnimationFrame(() => {
      try { window.focus(); } catch {}
    });
    return result;
  };

  // Label chooser behavior is extended by global-labels.js through
  // HelloLabelModal.chooseLabelModal. Keeping one owner avoids patch-order bugs.

  if (typeof I18N !== "undefined") {
    if (I18N.zh) I18N.zh.invalidLabelme = "同名 JSON 不是 HelloLabel shape 格式。";
    if (I18N.en) I18N.en.invalidLabelme = "The same-name JSON is not in HelloLabel shape format.";
    try { applyLanguage(state.language, false); } catch {}
  }
})();
