"use strict";

(() => {
  if (window.__helloLabelMobileFolderCompatInstalled) return;
  window.__helloLabelMobileFolderCompatInstalled = true;

  const originalRequestFolder = requestFolder;
  const originalSaveJsonToFolder = saveJsonToFolder;
  const originalDeleteCurrentJson = deleteCurrentJson;
  const originalUpdateActionButtons = updateActionButtons;

  const text = (zh, en) => state?.language === "en" ? en : zh;
  const isCompatMode = () => state?.dirHandle?.__helloLabelMobileCompat === true;
  let pickerInput = null;

  function cleanRelativePath(file) {
    return String(file?.webkitRelativePath || file?.name || "").replace(/\\/g, "/");
  }

  function selectedRootName(files) {
    for (const file of files) {
      const rel = cleanRelativePath(file);
      if (rel.includes("/")) return rel.split("/")[0] || text("手机文件夹", "Mobile folder");
    }
    return text("手机文件夹", "Mobile folder");
  }

  function topLevelFiles(files) {
    const selected = Array.from(files || []);
    const withRelative = selected.filter(file => cleanRelativePath(file).includes("/"));
    if (!withRelative.length) return selected;
    return selected.filter(file => {
      const parts = cleanRelativePath(file).split("/").filter(Boolean);
      return parts.length === 2;
    });
  }

  function fileFromText(name, content) {
    try {
      return new File([content], name, { type: "application/json", lastModified: Date.now() });
    } catch {
      const blob = new Blob([content], { type: "application/json" });
      blob.name = name;
      blob.lastModified = Date.now();
      return blob;
    }
  }

  class MobileFileHandle {
    constructor(directory, name) {
      this.kind = "file";
      this.name = name;
      this._directory = directory;
    }

    async getFile() {
      const entry = this._directory._lookup(this.name);
      if (!entry) throw new DOMException("File not found", "NotFoundError");
      if (entry.file) return entry.file;
      return fileFromText(entry.name, entry.text || "");
    }

    async createWritable() {
      let buffer = "";
      let closed = false;
      return {
        write: async value => {
          if (closed) throw new DOMException("Writer is closed", "InvalidStateError");
          if (typeof value === "string") buffer = value;
          else if (value instanceof Blob) buffer = await value.text();
          else if (value && typeof value === "object" && "data" in value) {
            const data = value.data;
            buffer = data instanceof Blob ? await data.text() : String(data ?? "");
          } else buffer = String(value ?? "");
        },
        close: async () => {
          if (closed) return;
          closed = true;
          this._directory._setGenerated(this.name, buffer);
        },
        abort: async () => { closed = true; },
      };
    }
  }

  class MobileDirectoryHandle {
    constructor(name, files) {
      this.kind = "directory";
      this.name = name;
      this.__helloLabelMobileCompat = true;
      this._entries = new Map();
      for (const file of files) this._setFile(file.name, file);
    }

    _key(name) { return String(name || "").normalize("NFC").toLocaleLowerCase(); }
    _lookup(name) { return this._entries.get(this._key(name)) || null; }
    _setFile(name, file) {
      this._entries.set(this._key(name), { name, file, text: null, generated: false });
    }
    _setGenerated(name, content) {
      this._entries.set(this._key(name), { name, file: null, text: String(content || ""), generated: true });
    }

    async *entries() {
      const rows = [...this._entries.values()].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      for (const row of rows) yield [row.name, new MobileFileHandle(this, row.name)];
    }

    async getFileHandle(name, options = {}) {
      const existing = this._lookup(name);
      if (existing) return new MobileFileHandle(this, existing.name);
      if (!options?.create) throw new DOMException("File not found", "NotFoundError");
      this._setGenerated(name, "");
      return new MobileFileHandle(this, name);
    }

    async queryPermission() { return "granted"; }
    async requestPermission() { return "granted"; }

    async removeEntry() {
      throw new DOMException(text(
        "移动端兼容模式无法直接删除手机原文件。",
        "Mobile compatibility mode cannot delete the original file on your device."
      ), "NotSupportedError");
    }
  }

  function ensurePickerInput() {
    if (pickerInput) return pickerInput;
    pickerInput = document.createElement("input");
    pickerInput.type = "file";
    pickerInput.multiple = true;
    pickerInput.setAttribute("webkitdirectory", "");
    pickerInput.setAttribute("directory", "");
    pickerInput.accept = ".jpg,.jpeg,.png,.bmp,.tif,.tiff,.webp,.json,image/*,application/json";
    pickerInput.style.cssText = "position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;pointer-events:none";
    document.body.appendChild(pickerInput);
    return pickerInput;
  }

  async function activateSelectedFolder(fileList) {
    const allFiles = Array.from(fileList || []);
    if (!allFiles.length) return;

    try {
      await flushPendingSave();
    } catch (err) {
      setStatus(t("folderSwitchSaveFailed", { message: err.message }), true);
      alert(t("folderSwitchCancelled", { message: err.message }));
      return;
    }

    const files = topLevelFiles(allFiles);
    if (!files.length) {
      alert(text(
        "所选目录的根目录没有可读取的文件。请选择直接包含图片的文件夹。",
        "No readable files were found at the selected folder root. Choose the folder that directly contains the images."
      ));
      return;
    }

    const rootName = selectedRootName(allFiles);
    resetCurrentState();
    state.dirHandle = new MobileDirectoryHandle(rootName, files);
    state.__helloLabelMobileCompat = true;
    state.fileFilter = "";
    els.fileFilterInput.value = "";
    els.folderName.textContent = `${rootName} · ${text("移动兼容", "Mobile compat")}`;
    await refreshFolderEntries();
    setStatus(text(
      `已进入移动端兼容模式，共 ${state.entries.length} 张图片。可读取同名 JSON；自动保存暂存在当前页面，点击“保存 JSON”会下载 JSON 文件。`,
      `Mobile compatibility mode is active with ${state.entries.length} images. Same-name JSON files can be read; autosave stays in this page, and “Save JSON” downloads the JSON file.`
    ));
    updateActionButtons();
  }

  function openCompatPicker() {
    const input = ensurePickerInput();
    input.value = "";
    input.onchange = () => {
      const files = input.files;
      input.onchange = null;
      void activateSelectedFolder(files);
    };
    input.click();
  }

  async function compatibleRequestFolder() {
    if (typeof window.showDirectoryPicker === "function") {
      return originalRequestFolder();
    }
    openCompatPicker();
  }

  async function saveCompatJson(showMessage = true) {
    if (!isCompatMode()) return originalSaveJsonToFolder(showMessage);
    if (!state.data || !state.dirHandle || !state.imageName) return;

    if (state.saveTimer) {
      clearTimeout(state.saveTimer);
      state.saveTimer = 0;
    }

    ensureDataImageFields();
    ensureHelloLabel();
    const imageName = state.imageName;
    const saveRevision = state.revision;
    const payload = JSON.stringify(state.data, null, 2);
    const jsonName = `${stemOf(imageName)}.json`;
    const handle = state.jsonHandle || await state.dirHandle.getFileHandle(jsonName, { create: true });
    const writable = await handle.createWritable();
    try { await writable.write(payload); } finally { await writable.close(); }

    state.jsonHandle = handle;
    state.savedRevision = Math.max(state.savedRevision, saveRevision);
    if (state.revision === saveRevision) state.dirty = false;
    const entry = state.entries.find(item => item.name === imageName);
    if (entry) entry.hasJson = true;
    renderFileList();

    if (showMessage) {
      const blob = new Blob([payload], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = jsonName;
      anchor.rel = "noopener";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setSaveState(text("已下载", "Downloaded"), "saved");
      setStatus(text(
        `已下载 ${jsonName}。移动兼容模式不会直接覆盖手机原文件。`,
        `Downloaded ${jsonName}. Mobile compatibility mode does not overwrite the original file on your device.`
      ));
    } else {
      setSaveState(text("已暂存", "Stored in page"), "saved");
    }
  }

  async function compatibleDeleteCurrentJson() {
    if (!isCompatMode()) return originalDeleteCurrentJson();
    alert(text(
      "移动端兼容模式不能直接删除手机中的原 JSON 文件。你可以在手机文件管理器中删除，或修改标注后点击“保存 JSON”下载新文件。",
      "Mobile compatibility mode cannot delete the original JSON file on your device. Delete it in your file manager, or edit the annotations and use “Save JSON” to download a new file."
    ));
  }

  function compatibleUpdateActionButtons() {
    originalUpdateActionButtons();
    if (isCompatMode() && els.deleteJsonBtn) {
      els.deleteJsonBtn.disabled = !state.data;
      els.deleteJsonBtn.title = text(
        "移动兼容模式：无法直接删除手机原文件",
        "Mobile compatibility mode: original device files cannot be deleted directly"
      );
    }
  }

  requestFolder = compatibleRequestFolder;
  saveJsonToFolder = saveCompatJson;
  deleteCurrentJson = compatibleDeleteCurrentJson;
  updateActionButtons = compatibleUpdateActionButtons;

  if (els.openFolderBtn) {
    els.openFolderBtn.removeEventListener("click", originalRequestFolder);
    els.openFolderBtn.addEventListener("click", compatibleRequestFolder);
  }
  if (els.deleteJsonBtn) {
    els.deleteJsonBtn.removeEventListener("click", originalDeleteCurrentJson);
    els.deleteJsonBtn.addEventListener("click", compatibleDeleteCurrentJson);
  }

  window.helloLabelMobileFolderCompat = {
    supported: true,
    nativeDirectoryPicker: typeof window.showDirectoryPicker === "function",
    usingCompatMode: () => isCompatMode(),
  };
})();
