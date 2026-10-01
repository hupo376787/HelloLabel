"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function setStatus(text, error = false) {
    c.els.statusText.textContent = text;
    c.els.statusText.style.color = error ? "var(--danger)" : "";
  }

  function setBusy(on, text = c.t("processing")) {
    c.els.busy.classList.toggle("hidden", !on);
    c.els.busyText.textContent = text;
  }

  function setSaveState(text, kind = "") {
    c.els.saveState.textContent = text;
    c.els.saveState.className = `save-state ${kind}`.trim();
  }

  function responseError(response) {
    return response.json()
      .then(json => json.detail || JSON.stringify(json))
      .catch(() => `${response.status} ${response.statusText}`);
  }

  function updateActionButtons() {
    const { state, els, primaryShape } = c;
    const hasData = !!state.data;
    const selected = !!primaryShape();

    [els.fitBtn,els.actualBtn,els.zoomOutBtn,els.zoomInBtn,els.saveBtn]
      .forEach(button => button.disabled = !hasData);

    if (els.deleteJsonBtn) els.deleteJsonBtn.disabled = !(hasData && state.jsonHandle);
    els.deleteBtn.disabled = !(hasData && selected && state.mode === "pointer");
    els.undoBtn.disabled = state.history.length === 0;
    els.redoBtn.disabled = state.future.length === 0;
    els.samModeBtn.disabled = !hasData;
    els.yoloRunBtn.disabled = !hasData;
  }

  function enableImageUi(on) {
    const { els } = c;
    updateActionButtons();
    els.emptyState.classList.toggle("hidden", on);
    els.viewport.classList.toggle("hidden", !on);
  }

  const api = {
    configure,
    setStatus,
    setBusy,
    setSaveState,
    responseError,
    updateActionButtons,
    enableImageUi
  };

  window.HelloLabelStatusUI = api;
})();
