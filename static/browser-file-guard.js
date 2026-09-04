"use strict";

(() => {
  const originalDeleteCurrentJson = deleteCurrentJson;
  const fold = value => String(value || "").normalize("NFC").toLocaleLowerCase();
  const text = (zh, en) => state?.language === "en" ? en : zh;

  function imageStemConflicts(imageName) {
    const key = fold(stemOf(imageName));
    return (state.entries || []).filter(entry => fold(stemOf(entry.name)) === key);
  }

  function assertUniqueImageStem(imageName) {
    const conflicts = imageStemConflicts(imageName);
    if (conflicts.length <= 1) return;
    const names = conflicts.map(entry => entry.name).join(", ");
    throw new Error(text(
      `检测到多个图片共享同一个 JSON 文件名：${names}。请先重命名其中一个图片后再标注，避免覆盖同一个 ${stemOf(imageName)}.json。`,
      `Multiple images share the same Labelme JSON stem: ${names}. Rename one image before annotating to avoid overwriting ${stemOf(imageName)}.json.`
    ));
  }

  async function findExistingJson(imageName) {
    if (!state.dirHandle) return null;
    const target = fold(`${stemOf(imageName)}.json`);
    const matches = [];
    for await (const [name, handle] of state.dirHandle.entries()) {
      if (handle.kind === "file" && fold(name) === target) matches.push({ name, handle });
    }
    if (matches.length > 1) {
      throw new Error(text(
        `检测到大小写冲突的 JSON：${matches.map(item => item.name).join(", ")}。请只保留一个同名 JSON 后重试。`,
        `Ambiguous case-colliding JSON files were found: ${matches.map(item => item.name).join(", ")}. Keep only one matching JSON file and retry.`
      ));
    }
    return matches[0] || null;
  }

  siblingJsonHandle = async function(imageName, create = false) {
    assertUniqueImageStem(imageName);
    const existing = await findExistingJson(imageName);
    if (existing) {
      state.__helloLabelJsonActualName = existing.name;
      return existing.handle;
    }
    const canonical = `${stemOf(imageName)}.json`;
    state.__helloLabelJsonActualName = canonical;
    if (!create) return null;
    return state.dirHandle.getFileHandle(canonical, { create: true });
  };

  async function safeDeleteCurrentJson() {
    if (!state.data || !state.dirHandle || !state.imageName) return;
    if (!state.jsonHandle) { setStatus(t("noJsonToDelete")); return; }
    const confirmed = await confirmModal(t("deleteJsonTitle"), escapeHtml(t("deleteJsonConfirm")), t("deleteJson"), true);
    if (!confirmed) return;
    try {
      if (state.saveTimer) { clearTimeout(state.saveTimer); state.saveTimer = 0; }
      state.saveQueued = false;
      if (state.saveInFlight && state.savePromise) await state.savePromise;
      const jsonName = state.jsonHandle?.name || state.__helloLabelJsonActualName || `${stemOf(state.imageName)}.json`;
      await state.dirHandle.removeEntry(jsonName);
      state.jsonHandle = null;
      state.__helloLabelJsonActualName = null;
      state.data = createEmptyLabelme();
      state.runtimeIds = []; state.runtimeMeta = {}; state.history = []; state.future = []; state.activeLabel = null; state.drawing = null; state.editing = null;
      state.selectedIds.clear(); state.primaryId = null; state.activeHandle = null;
      state.dirty = false; state.revision = 0; state.savedRevision = 0;
      state.sam = { points: [], labels: [], box: null, history: [], preview: null, drag: null, requestSeq: 0 };
      ensureDataImageFields(); ensureHelloLabel();
      const entry = state.entries.find(item => item.name === state.imageName); if (entry) entry.hasJson = false;
      renderFileList(); renderAll();
      setSaveState(t("notCreatedJson")); setStatus(t("jsonDeleted", { name: stemOf(state.imageName) })); updateActionButtons();
    } catch (err) {
      const message = err?.message || String(err); setStatus(t("jsonDeleteFailed", { message }), true); alert(t("jsonDeleteFailed", { message }));
    }
  }

  deleteCurrentJson = safeDeleteCurrentJson;
  if (els.deleteJsonBtn) {
    els.deleteJsonBtn.removeEventListener("click", originalDeleteCurrentJson);
    els.deleteJsonBtn.addEventListener("click", safeDeleteCurrentJson);
  }
})();
