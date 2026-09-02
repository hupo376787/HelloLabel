"use strict";

(() => {
  const STORAGE_KEY = "hellolabel-global-labels-v1";
  let hasStoredLabels = false;

  function validColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value || ""));
  }

  function normalizeLabels(value) {
    const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    const out = {};
    for (const [rawName, rawMeta] of Object.entries(source)) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      const rawColor = typeof rawMeta === "string" ? rawMeta : rawMeta?.color;
      const color = validColor(rawColor) ? rawColor : stableColor(name);
      out[name] = { color };
    }
    return out;
  }

  function loadGlobalLabels() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      hasStoredLabels = true;
      const parsed = JSON.parse(raw);
      return normalizeLabels(parsed?.labels ?? parsed);
    } catch {
      return {};
    }
  }

  const globalLabels = loadGlobalLabels();

  function persistGlobalLabels() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, product: "HelloLabel", type: "label-library", labels: globalLabels }));
      hasStoredLabels = true;
    } catch {}
  }

  function mergeLegacyLabels(target, labels, shapes = []) {
    let changed = false;
    const normalized = normalizeLabels(labels);
    for (const [name, meta] of Object.entries(normalized)) {
      if (target[name]) continue;
      target[name] = meta;
      changed = true;
    }
    for (const shape of Array.isArray(shapes) ? shapes : []) {
      const name = String(shape?.label || "").trim();
      if (!name || target[name]) continue;
      target[name] = { color: stableColor(name) };
      changed = true;
    }
    return changed;
  }

  async function migrateFolderLabelsOnce() {
    if (hasStoredLabels || !state.dirHandle) return;
    const migrated = {};
    try {
      for await (const [name, handle] of state.dirHandle.entries()) {
        if (handle.kind !== "file" || !name.toLowerCase().endsWith(".json")) continue;
        try {
          const file = await handle.getFile();
          const data = JSON.parse(await file.text());
          const extension = data?.hellolabel && typeof data.hellolabel === "object"
            ? data.hellolabel
            : (data?.labelit && typeof data.labelit === "object" ? data.labelit : null);
          mergeLegacyLabels(migrated, extension?.labels, data?.shapes);
        } catch {}
      }
    } finally {
      for (const [name, meta] of Object.entries(migrated)) {
        if (!globalLabels[name]) globalLabels[name] = meta;
      }
      persistGlobalLabels();
      renderLabelList();
    }
  }

  // Keep Labelme/HelloLabel metadata inside each image JSON independent from the
  // application-level library. Global add/rename/delete/import operations must
  // never rewrite existing annotation JSON files or mutate their shape labels.
  const originalEnsureHelloLabel = ensureHelloLabel;
  ensureHelloLabel = function() {
    return originalEnsureHelloLabel();
  };

  labelColor = function(label) {
    const name = String(label || "");
    const globalColor = globalLabels[name]?.color;
    if (validColor(globalColor)) return globalColor;
    const imageColor = state.data?.hellolabel?.labels?.[name]?.color;
    return validColor(imageColor) ? imageColor : stableColor(name);
  };

  const originalRefreshFolderEntries = refreshFolderEntries;
  refreshFolderEntries = async function(...args) {
    const result = await originalRefreshFolderEntries(...args);
    await migrateFolderLabelsOnce();
    return result;
  };

  const originalResetCurrentState = resetCurrentState;
  resetCurrentState = function(...args) {
    const previousActive = state.activeLabel;
    const result = originalResetCurrentState(...args);
    if (previousActive && globalLabels[previousActive]) state.activeLabel = previousActive;
    renderLabelList();
    return result;
  };

  function currentUsage() {
    const usage = new Map();
    for (const shape of state.data?.shapes || []) {
      usage.set(shape.label, (usage.get(shape.label) || 0) + 1);
    }
    return usage;
  }

  renderLabelList = function() {
    const usage = currentUsage();
    els.labelList.replaceChildren();
    const names = Object.keys(globalLabels);
    els.labelCount.textContent = String(names.length);

    for (const name of names) {
      const row = document.createElement("div");
      row.className = "label-row" + (state.activeLabel === name ? " active" : "");
      row.dataset.label = name;

      const color = document.createElement("input");
      color.type = "color";
      color.className = "label-color";
      color.value = globalLabels[name].color;
      color.title = t("changeLabelColor");
      color.addEventListener("click", event => event.stopPropagation());
      color.addEventListener("change", event => {
        event.stopPropagation();
        changeLabelColor(name, color.value);
      });

      const text = document.createElement("div");
      text.className = "label-name";
      text.textContent = name;
      text.title = name;

      const count = document.createElement("div");
      count.className = "label-count";
      count.textContent = String(usage.get(name) || 0);

      const rename = document.createElement("button");
      rename.className = "icon-btn";
      rename.title = t("rename");
      rename.textContent = "✎";
      rename.addEventListener("click", event => {
        event.stopPropagation();
        void renameLabel(name);
      });

      const del = document.createElement("button");
      del.className = "icon-btn danger";
      del.title = t("deleteLabel");
      del.textContent = "×";
      del.addEventListener("click", event => {
        event.stopPropagation();
        void deleteLabel(name);
      });

      row.append(color, text, count, rename, del);
      row.addEventListener("click", () => {
        state.activeLabel = name;
        renderLabelList();
        setStatus(t("currentDrawLabel", { name }));
      });
      els.labelList.appendChild(row);
    }
  };

  changeLabelColor = function(name, color) {
    if (!globalLabels[name] || !validColor(color)) return;
    globalLabels[name].color = color;
    persistGlobalLabels();
    renderLabelList();
    if (state.data) {
      buildRenderCache();
      buildLabelAtlas();
      renderSelectedOverlay();
      scheduleViewportRender();
    }
    setStatus(t("labelColorChanged", { name }));
  };

  chooseLabelModal = async function() {
    const labels = Object.keys(globalLabels);
    const html = `<div>${escapeHtml(t("chooseOrCreateLabel"))}</div><div id="modalLabelList" class="modal-label-list">${labels.map(name => `<div class="modal-label-option" data-label="${escapeHtml(name)}"><span class="dot" style="background:${labelColor(name)}"></span><span>${escapeHtml(name)}</span></div>`).join("") || `<div class="muted">${escapeHtml(t("noLabelsYet"))}</div>`}</div><label>${escapeHtml(t("newLabel"))}<input id="modalNewLabel" type="text" placeholder="${escapeHtml(t("newLabelPlaceholder"))}" /></label>`;
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
      const selectRow = row => {
        if (!row) return;
        picked = row.dataset.label;
        list?.querySelectorAll(".modal-label-option").forEach(item => item.classList.toggle("active", item === row));
        const input = $("modalNewLabel");
        if (input) input.value = "";
      };
      list?.addEventListener("click", event => selectRow(event.target.closest("[data-label]")));
      list?.addEventListener("dblclick", event => {
        const row = event.target.closest("[data-label]");
        if (!row) return;
        selectRow(row);
        event.preventDefault();
        closeModal("ok");
      });
      $("modalNewLabel")?.addEventListener("input", () => {
        picked = null;
        list?.querySelectorAll(".modal-label-option").forEach(item => item.classList.remove("active"));
      });
    });

    const result = await promise;
    if (result !== "ok") return null;
    const typed = String($("modalNewLabel")?.value || "").trim();
    return typed || picked || null;
  };

  resolveNewShapeLabel = async function() {
    if (state.activeLabel && globalLabels[state.activeLabel]) return state.activeLabel;
    return chooseLabelModal();
  };

  addLabel = async function() {
    const name = await promptText(t("addLabel"), t("enterNewLabel"), "");
    if (!name) return;
    if (!globalLabels[name]) {
      globalLabels[name] = { color: stableColor(name) };
      persistGlobalLabels();
      setStatus(t("labelAdded", { name }));
    }
    state.activeLabel = name;
    renderLabelList();
  };

  // Rename only the software-level label definition. Existing shapes in the
  // current image and all historical JSON files keep their original label text.
  renameLabel = async function(oldName) {
    if (!globalLabels[oldName]) return;
    const newName = await promptText(t("renameLabel"), state.language === "en"
      ? "Rename this application label. Existing annotation JSON files and instances will not be changed."
      : "重命名软件级标签。已有标注 JSON 和实例不会被修改。", oldName);
    if (!newName || newName === oldName) return;

    const exists = !!globalLabels[newName];
    const message = state.language === "en"
      ? (exists
          ? `Label “${escapeHtml(newName)}” already exists. Merge the library entries only? Existing annotation JSON files will remain unchanged.`
          : `Rename library label “${escapeHtml(oldName)}” to “${escapeHtml(newName)}”? Existing annotation JSON files will remain unchanged.`)
      : (exists
          ? `标签“${escapeHtml(newName)}”已经存在。仅合并软件标签库中的定义吗？已有标注 JSON 不会修改。`
          : `将软件标签“${escapeHtml(oldName)}”重命名为“${escapeHtml(newName)}”？已有标注 JSON 不会修改。`);
    if (!await confirmModal(t("confirmRename"), message, exists ? t("mergeRename") : t("renameAction"))) return;

    const oldColor = globalLabels[oldName]?.color || stableColor(oldName);
    if (!exists) globalLabels[newName] = { color: oldColor };
    delete globalLabels[oldName];
    if (state.activeLabel === oldName) state.activeLabel = newName;
    persistGlobalLabels();
    renderLabelList();
    if (state.data) {
      buildRenderCache();
      buildLabelAtlas();
      renderSelectedOverlay();
      scheduleViewportRender();
    }
    setStatus(state.language === "en"
      ? `Renamed application label to “${newName}”. Annotation JSON was not changed.`
      : `已将软件标签重命名为“${newName}”，已有标注 JSON 未修改。`);
  };

  // Delete only the software-level definition. Do not replace/delete any existing
  // instances, and do not mark the current image dirty.
  deleteLabel = async function(name) {
    if (!globalLabels[name]) return;
    const message = state.language === "en"
      ? `Delete application label “${escapeHtml(name)}”? Existing annotation JSON files and instances will not be changed.`
      : `删除软件标签“${escapeHtml(name)}”？已有标注 JSON 和实例不会被修改。`;
    if (!await confirmModal(t("deleteLabel"), message, t("deleteAction"), true)) return;

    delete globalLabels[name];
    if (state.activeLabel === name) state.activeLabel = null;
    persistGlobalLabels();
    renderLabelList();
    if (state.data) {
      buildRenderCache();
      buildLabelAtlas();
      renderSelectedOverlay();
      scheduleViewportRender();
    }
    setStatus(state.language === "en"
      ? `Deleted application label “${name}”. Annotation JSON was not changed.`
      : `已删除软件标签“${name}”，已有标注 JSON 未修改。`);
  };

  function addImportedName(target, rawName, color = null) {
    let name = String(rawName ?? "").trim();
    if (!name) return;
    if ((name.startsWith('"') && name.endsWith('"')) || (name.startsWith("'") && name.endsWith("'"))) {
      name = name.slice(1, -1).trim();
    }
    if (!name || target[name]) return;
    target[name] = { color: validColor(color) ? color : stableColor(name) };
  }

  function parsePlainLabels(text) {
    const out = {};
    for (const token of String(text || "").replace(/^\uFEFF/, "").split(/[\r\n,]+/)) {
      addImportedName(out, token);
    }
    return out;
  }

  function parseJsonLabels(data) {
    const out = {};

    if (Array.isArray(data)) {
      for (const item of data) {
        if (typeof item === "string") addImportedName(out, item);
        else if (item && typeof item === "object") addImportedName(out, item.name ?? item.label, item.color);
      }
      return out;
    }

    if (!data || typeof data !== "object") return out;

    // HelloLabel global library format:
    // { schema: 1, product: "HelloLabel", type: "label-library", labels: { ... } }
    if (data.labels && typeof data.labels === "object") {
      if (Array.isArray(data.labels)) {
        for (const item of data.labels) {
          if (typeof item === "string") addImportedName(out, item);
          else if (item && typeof item === "object") addImportedName(out, item.name ?? item.label, item.color);
        }
      } else {
        Object.assign(out, normalizeLabels(data.labels));
      }
    }

    // Labelme / older HelloLabel annotation JSON.
    const extension = data.hellolabel && typeof data.hellolabel === "object"
      ? data.hellolabel
      : (data.labelit && typeof data.labelit === "object" ? data.labelit : null);
    if (extension?.labels) {
      const normalized = normalizeLabels(extension.labels);
      for (const [name, meta] of Object.entries(normalized)) if (!out[name]) out[name] = meta;
    }
    if (Array.isArray(data.shapes)) {
      for (const shape of data.shapes) {
        const name = String(shape?.label || "").trim();
        if (!name || out[name]) continue;
        const color = extension?.labels?.[name]?.color;
        addImportedName(out, name, color);
      }
    }

    return out;
  }

  function parseLabelFile(text) {
    const clean = String(text || "").replace(/^\uFEFF/, "").trim();
    if (!clean) return {};
    try {
      const parsed = JSON.parse(clean);
      if (typeof parsed === "string") return parsePlainLabels(parsed);
      const labels = parseJsonLabels(parsed);
      if (Object.keys(labels).length) return labels;
    } catch {}
    return parsePlainLabels(clean);
  }

  function mergeImportedLabels(imported) {
    let added = 0;
    let skipped = 0;
    for (const [name, meta] of Object.entries(imported || {})) {
      if (globalLabels[name]) {
        skipped++;
        continue;
      }
      globalLabels[name] = { color: validColor(meta?.color) ? meta.color : stableColor(name) };
      added++;
    }
    if (added) persistGlobalLabels();
    return { added, skipped, total: Object.keys(imported || {}).length };
  }

  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = ".json,.txt,.labels,.names,application/json,text/plain";
  importInput.hidden = true;
  importInput.tabIndex = -1;
  document.body.appendChild(importInput);

  const importButton = document.createElement("button");
  importButton.id = "importLabelsBtn";
  importButton.type = "button";
  importButton.className = "mini";
  importButton.style.width = "30px";
  importButton.style.minWidth = "30px";
  importButton.style.padding = "0";
  importButton.style.display = "inline-flex";
  importButton.style.alignItems = "center";
  importButton.style.justifyContent = "center";
  importButton.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" style="width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round"><path d="M12 3v11"/><path d="m8.5 10.5 3.5 3.5 3.5-3.5"/><path d="M5 16.5V20h14v-3.5"/></svg>';

  function updateImportButtonLanguage() {
    const label = state.language === "en" ? "Import labels" : "导入标签";
    importButton.title = label;
    importButton.setAttribute("aria-label", label);
  }
  updateImportButtonLanguage();

  const headingActions = els.addLabelBtn?.parentElement;
  if (headingActions) headingActions.insertBefore(importButton, els.addLabelBtn);

  importButton.addEventListener("click", () => {
    importInput.value = "";
    importInput.click();
  });

  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    if (!file) return;
    try {
      const imported = parseLabelFile(await file.text());
      const count = Object.keys(imported).length;
      if (!count) {
        const message = state.language === "en"
          ? "No recognizable labels were found in this file."
          : "文件中没有识别到可导入的标签。";
        setStatus(message, true);
        alert(message);
        return;
      }
      const result = mergeImportedLabels(imported);
      renderLabelList();
      const message = state.language === "en"
        ? `Imported ${result.added} new label(s); ${result.skipped} existing label(s) were kept.`
        : `已导入 ${result.added} 个新标签；${result.skipped} 个同名标签保留现有定义。`;
      setStatus(message);
    } catch (error) {
      const message = state.language === "en"
        ? `Failed to import labels: ${error?.message || error}`
        : `导入标签失败：${error?.message || error}`;
      setStatus(message, true);
      alert(message);
    }
  });

  const originalApplyLanguage = applyLanguage;
  applyLanguage = function(...args) {
    const result = originalApplyLanguage(...args);
    updateImportButtonLanguage();
    return result;
  };

  // The original click handler only permits adding labels when an image is open.
  // A software-level label library should also be editable from the empty state.
  els.addLabelBtn?.addEventListener("click", event => {
    if (state.data) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    void addLabel();
  }, true);

  renderLabelList();
})();
