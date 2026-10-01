"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  async function requestFolder() {
    const { flushPendingSave, setStatus, t, resetCurrentState, state, els } = c;

    try {
      await flushPendingSave();
    } catch (error) {
      setStatus(t("folderSwitchSaveFailed", { message:error.message }), true);
      alert(t("folderSwitchCancelled", { message:error.message }));
      return;
    }

    if (!window.showDirectoryPicker) {
      alert(t("browserUnsupported"));
      return;
    }

    try {
      const handle = await window.showDirectoryPicker({ mode:"readwrite" });
      const permission = await handle.requestPermission({ mode:"readwrite" });
      if (permission !== "granted") throw new Error(t("folderPermissionDenied"));

      resetCurrentState();
      state.dirHandle = handle;
      state.fileFilter = "";
      els.fileFilterInput.value = "";
      els.folderName.textContent = handle.name;
      await refreshFolderEntries();
    } catch (error) {
      if (error?.name !== "AbortError") setStatus(String(error), true);
    }
  }

  async function refreshFolderEntries() {
    const { state, isImage, stemOf, setStatus, t } = c;
    const entries = [];
    const jsonNames = new Set();

    for await (const [name, handle] of state.dirHandle.entries()) {
      if (handle.kind !== "file") continue;
      if (name.toLowerCase().endsWith(".json")) jsonNames.add(name.toLowerCase());
      if (isImage(name)) entries.push({ name, handle });
    }

    state.entries = entries
      .sort((a,b) => a.name.localeCompare(b.name, undefined, { numeric:true }))
      .map(entry => ({
        ...entry,
        hasJson:jsonNames.has(`${stemOf(entry.name)}.json`.toLowerCase())
      }));

    renderFileList();
    setStatus(t("folderOpened", { count:state.entries.length }));
  }

  function renderFileList() {
    const { state, els, t, escapeHtml } = c;
    if (!els.fileList) return;

    if (!state.dirHandle && !state.entries.length) {
      els.fileList.replaceChildren();
      els.imageCount.textContent = "0";
      els.clearFileFilterBtn.classList.add("hidden");
      return;
    }

    const query = String(state.fileFilter || "").trim().toLocaleLowerCase();
    const filtered = query
      ? state.entries.filter(entry => entry.name.toLocaleLowerCase().includes(query))
      : state.entries;

    els.fileList.replaceChildren();
    els.imageCount.textContent = query ? `${filtered.length}/${state.entries.length}` : String(state.entries.length);
    els.clearFileFilterBtn.classList.toggle("hidden", !query);

    if (!filtered.length) {
      const empty = document.createElement("div");
      empty.className = "file-list-empty";
      empty.textContent = t("noMatchingImages");
      els.fileList.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const entry of filtered) {
      const row = document.createElement("div");
      row.className = "file-item" + (entry.name === state.imageName ? " active" : "");
      row.dataset.name = entry.name;
      row.innerHTML = `<span class="file-type-icon"><svg viewBox="0 0 24 24"><rect x="3.25" y="4.25" width="17.5" height="15.5" rx="1.8"/><circle cx="8.2" cy="9" r="1.6"/><path d="M5.6 17.2l4.2-4.3 3.1 3.1 2.4-2.5 3.1 3.7"/></svg></span><span class="name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>${entry.hasJson?'<span class="badge">JSON</span>':''}`;
      row.addEventListener("click", () => openImageEntry(entry));
      fragment.appendChild(row);
    }
    els.fileList.appendChild(fragment);
  }

  async function siblingJsonHandle(imageName, create = false) {
    const { state, stemOf } = c;
    try {
      return await state.dirHandle.getFileHandle(`${stemOf(imageName)}.json`, { create });
    } catch (error) {
      if (error?.name === "NotFoundError") return null;
      throw error;
    }
  }

  function markActiveFile(name) {
    c.els.fileList.querySelectorAll(".file-item")
      .forEach(item => item.classList.toggle("active", item.dataset.name === name));
  }

  function resetCurrentState() {
    const {
      state, els, setSaveState, t,
      updateSelectionPanel, enableImageUi, updateActionButtons
    } = c;

    if (state.transformRaf) cancelAnimationFrame(state.transformRaf);
    if (state.instanceListRaf) cancelAnimationFrame(state.instanceListRaf);
    if (state.saveTimer) clearTimeout(state.saveTimer);

    if (state.previewUrl) {
      URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = null;
    }

    state.imageHandle = null;
    state.imageFile = null;
    state.imageName = "";
    state.jsonHandle = null;
    state.previewBlob = null;
    state.aiImageToken = null;
    state.width = 0;
    state.height = 0;
    state.data = null;
    state.selectedIds.clear();
    state.primaryId = null;
    state.activeHandle = null;
    state.activeLabel = null;
    state.history = [];
    state.future = [];
    state.drawing = null;
    state.editing = null;
    state.dirty = false;
    state.revision = 0;
    state.savedRevision = 0;
    state.saveQueued = false;
    state.shapeById.clear();
    state.indexById.clear();
    state.shapeGrid.clear();
    state.boundsById.clear();
    state.runtimeIds = [];
    state.runtimeMeta = {};
    state.instanceIds = [];
    state.sam = {points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0};

    els.imageView.removeAttribute("src");
    els.stage.style.width = "0px";
    els.stage.style.height = "0px";
    els.labelList.replaceChildren();
    els.instanceListInner.replaceChildren();
    els.instanceListInner.style.height = "0px";
    els.controlHandles.replaceChildren();
    els.selectedPath.classList.add("hidden-svg");
    els.drawingPath.classList.add("hidden-svg");
    els.aiPreviewPath.classList.add("hidden-svg");
    els.samPrompts.replaceChildren();
    els.selectedLabelText.classList.add("hidden-svg");

    setSaveState(t("noFileOpen"));
    updateSelectionPanel();
    enableImageUi(false);
    updateActionButtons();
    state.glRenderer?.clear?.();
  }

  async function loadPreview(file) {
    const { state, els, responseError, resizeOverlay } = c;
    const form = new FormData();
    form.append("file", file, file.name);

    const response = await fetch("/api/preview", { method:"POST", body:form });
    if (!response.ok) throw new Error(await responseError(response));

    const blob = await response.blob();
    state.previewBlob = blob;
    state.aiImageToken = response.headers.get("X-AI-Image-Token") || null;
    state.width = Number(response.headers.get("X-Image-Width"));
    state.height = Number(response.headers.get("X-Image-Height"));

    if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
    state.previewUrl = URL.createObjectURL(blob);
    els.imageView.src = state.previewUrl;
    try { await els.imageView.decode(); } catch {}

    els.stage.style.width = `${state.width}px`;
    els.stage.style.height = `${state.height}px`;
    resizeOverlay();
  }

  async function openImageEntry(entry) {
    const {
      state, flushPendingSave, setSaveState, setStatus, t, setBusy,
      validateLabelme, stemOf, createEmptyLabelme, ensureDataImageFields,
      ensureHelloLabel, renderAll, enableImageUi, fitToWindow
    } = c;

    try {
      await flushPendingSave();
    } catch (error) {
      setSaveState(t("saveFailed"), "error");
      setStatus(t("imageSwitchSaveFailed", { message:error.message }), true);
      alert(t("imageSwitchCancelled", { message:error.message }));
      return;
    }

    setBusy(true, t("readImage"));
    try {
      resetCurrentState();
      state.imageHandle = entry.handle;
      state.imageFile = await entry.handle.getFile();
      state.imageName = entry.name;
      markActiveFile(entry.name);

      await api.loadPreview(state.imageFile);
      state.jsonHandle = await siblingJsonHandle(entry.name, false);

      if (state.jsonHandle) {
        const file = await state.jsonHandle.getFile();
        state.data = validateLabelme(JSON.parse(await file.text()));
        setStatus(t("loadedJson", { name:stemOf(entry.name) }));
      } else {
        state.data = createEmptyLabelme();
        setStatus(t("emptyJson"));
      }

      ensureDataImageFields();
      ensureHelloLabel();
      state.dirty = false;
      state.revision = 0;
      state.savedRevision = 0;
      setSaveState(state.jsonHandle ? t("saved") : t("notCreatedJson"), state.jsonHandle ? "saved" : "");

      renderAll();
      enableImageUi(true);
      requestAnimationFrame(fitToWindow);
    } catch (error) {
      console.error(error);
      setStatus(error?.message || String(error), true);
      alert(t("openFailed", { message:error?.message || error }));
    } finally {
      setBusy(false);
    }
  }

  const api = {
    configure,
    requestFolder,
    refreshFolderEntries,
    renderFileList,
    siblingJsonHandle,
    markActiveFile,
    resetCurrentState,
    loadPreview,
    openImageEntry
  };

  window.HelloLabelFolder = api;
})();
