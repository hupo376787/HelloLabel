"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function snapshot() {
    const { state, deepClone } = c;
    return {
      shapes:deepClone(state.data.shapes),
      hellolabel:deepClone(state.data.hellolabel),
      runtimeIds:deepClone(state.runtimeIds),
      runtimeMeta:deepClone(state.runtimeMeta),
      activeLabel:state.activeLabel
    };
  }

  function pushHistory() {
    const { state, updateActionButtons } = c;
    if (!state.data) return;
    state.history.push(snapshot());
    if (state.history.length > 80) state.history.shift();
    state.future = [];
    updateActionButtons();
  }

  function restoreSnapshot(value) {
    const { state, deepClone, ensureHelloLabel, clearSelection, t, renderAll } = c;
    state.data.shapes = deepClone(value.shapes);
    state.data.hellolabel = deepClone(value.hellolabel);
    state.runtimeIds = deepClone(value.runtimeIds || []);
    state.runtimeMeta = deepClone(value.runtimeMeta || {});
    state.activeLabel = value.activeLabel || null;
    ensureHelloLabel();
    clearSelection();
    markDirty(t("modified"));
    renderAll();
  }

  function undo() {
    const { state, updateActionButtons } = c;
    if (!state.history.length || !state.data) return;
    state.future.push(snapshot());
    restoreSnapshot(state.history.pop());
    updateActionButtons();
  }

  function redo() {
    const { state, updateActionButtons } = c;
    if (!state.future.length || !state.data) return;
    state.history.push(snapshot());
    restoreSnapshot(state.future.pop());
    updateActionButtons();
  }

  function markDirty(status = c.t("modifiedWaiting")) {
    const { state, setSaveState, setStatus, t } = c;
    state.revision++;
    state.dirty = true;
    setSaveState(t("unsaved"), "saving");
    setStatus(status);
    scheduleAutoSave();
  }

  function scheduleAutoSave() {
    const { state, saveJsonToFolder, setSaveState, setStatus, t } = c;
    if (!state.data || !state.dirHandle) return;
    if (state.saveTimer) clearTimeout(state.saveTimer);

    state.saveTimer = setTimeout(() => {
      saveJsonToFolder(false).catch(error => {
        setSaveState(t("autoSaveFailed"), "error");
        setStatus(error.message, true);
      });
    }, 300);
  }

  async function flushPendingSave() {
    const { state, saveJsonToFolder } = c;
    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
      state.saveTimer = 0;
    }
    if (state.saveInFlight && state.savePromise) await state.savePromise;
    if (state.dirty) await saveJsonToFolder(false);
    if (state.saveInFlight && state.savePromise) await state.savePromise;
    if (state.dirty) await saveJsonToFolder(false);
  }

  const api = {
    configure,
    pushHistory,
    restoreSnapshot,
    undo,
    redo,
    markDirty,
    scheduleAutoSave,
    flushPendingSave
  };

  window.HelloLabelHistory = api;
})();
