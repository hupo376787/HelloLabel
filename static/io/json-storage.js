"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  async function saveJsonToFolder(showMessage = true) {
    const {
      state, ensureDataImageFields, ensureHelloLabel, stemOf,
      setSaveState, t, setStatus, updateActionButtons, els,
      scheduleAutoSave
    } = c;

    if (!state.data || !state.dirHandle) return;

    if (state.saveInFlight) {
      state.saveQueued = true;
      if (state.savePromise) await state.savePromise;
      if (state.dirty) return saveJsonToFolder(showMessage);
      return;
    }

    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
      state.saveTimer = 0;
    }

    ensureDataImageFields();
    ensureHelloLabel();

    const dataRef = state.data;
    const imageName = state.imageName;
    const dirHandle = state.dirHandle;
    const knownHandle = state.jsonHandle;
    const saveRevision = state.revision;
    const payload = JSON.stringify(state.data, null, 2);

    state.saveInFlight = true;
    setSaveState(t("saving"), "saving");

    const task = (async () => {
      const handle = knownHandle
        || await dirHandle.getFileHandle(`${stemOf(imageName)}.json`, { create:true });

      const writable = await handle.createWritable();
      try {
        await writable.write(payload);
      } finally {
        await writable.close();
      }

      if (state.data === dataRef && state.imageName === imageName) {
        state.jsonHandle = handle;
        state.savedRevision = Math.max(state.savedRevision, saveRevision);

        if (state.revision === saveRevision) {
          state.dirty = false;
          setSaveState(t("saved"), "saved");
        } else {
          state.dirty = true;
          setSaveState(t("pendingSave"), "saving");
        }

        if (showMessage && state.revision === saveRevision) {
          setStatus(`${t("saved")} ${stemOf(imageName)}.json`);
        }

        updateActionButtons();

        const entry = state.entries.find(item => item.name === imageName);
        if (entry) entry.hasJson = true;

        const row = els.fileList.querySelector(`.file-item[data-name="${CSS.escape(imageName)}"]`);
        if (row && !row.querySelector(".badge")) {
          const badge = document.createElement("span");
          badge.className = "badge";
          badge.textContent = "JSON";
          row.appendChild(badge);
        }
      }
    })();

    state.savePromise = task;

    try {
      await task;
    } finally {
      if (state.savePromise === task) state.savePromise = null;
      state.saveInFlight = false;

      if (state.saveQueued || (state.dirty && state.revision > saveRevision)) {
        state.saveQueued = false;
        scheduleAutoSave();
      }
    }
  }

  async function deleteCurrentJson() {
    const {
      state, setStatus, t, confirmModal, escapeHtml, stemOf,
      createEmptyLabelme, ensureDataImageFields, ensureHelloLabel,
      renderFileList, renderAll, setSaveState, updateActionButtons
    } = c;

    if (!state.data || !state.dirHandle || !state.imageName) return;
    if (!state.jsonHandle) {
      setStatus(t("noJsonToDelete"));
      return;
    }

    const confirmed = await confirmModal(
      t("deleteJsonTitle"),
      escapeHtml(t("deleteJsonConfirm")),
      t("deleteJson"),
      true
    );
    if (!confirmed) return;

    try {
      if (state.saveTimer) {
        clearTimeout(state.saveTimer);
        state.saveTimer = 0;
      }

      state.saveQueued = false;
      if (state.saveInFlight && state.savePromise) await state.savePromise;

      const jsonName = `${stemOf(state.imageName)}.json`;
      await state.dirHandle.removeEntry(jsonName);

      state.jsonHandle = null;
      state.data = createEmptyLabelme();
      state.runtimeIds = [];
      state.runtimeMeta = {};
      state.history = [];
      state.future = [];
      state.activeLabel = null;
      state.drawing = null;
      state.editing = null;
      state.selectedIds.clear();
      state.primaryId = null;
      state.activeHandle = null;
      state.dirty = false;
      state.revision = 0;
      state.savedRevision = 0;
      state.sam = {points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0};

      ensureDataImageFields();
      ensureHelloLabel();

      const entry = state.entries.find(item => item.name === state.imageName);
      if (entry) entry.hasJson = false;

      renderFileList();
      renderAll();
      setSaveState(t("notCreatedJson"));
      setStatus(t("jsonDeleted", { name:stemOf(state.imageName) }));
      updateActionButtons();
    } catch (error) {
      const message = error?.message || String(error);
      setStatus(t("jsonDeleteFailed", { message }), true);
      alert(t("jsonDeleteFailed", { message }));
    }
  }

  const api = { configure, saveJsonToFolder, deleteCurrentJson };
  window.HelloLabelJsonStorage = api;
})();
