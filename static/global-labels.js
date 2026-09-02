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
      const color = validColor(rawMeta?.color) ? rawMeta.color : stableColor(name);
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ schema: 1, labels: globalLabels }));
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

  const originalEnsureHelloLabel = ensureHelloLabel;
  ensureHelloLabel = function() {
    if (!state.data) return;

    // The original normalizer also repairs legacy metadata and runtime IDs. Once
    // application-wide labels are attached, give it a temporary label map so its
    // per-image "discover shape labels" behavior cannot mutate the global list.
    const alreadyGlobal = state.data?.hellolabel?.labels === globalLabels;
    if (alreadyGlobal) {
      state.data.hellolabel.labels = {};
      originalEnsureHelloLabel();
    } else {
      originalEnsureHelloLabel();
    }
    state.data.hellolabel.labels = globalLabels;
  };

  labelColor = function(label) {
    return globalLabels[String(label)]?.color || stableColor(String(label || ""));
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
      ensureHelloLabel();
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
    if (state.data) ensureHelloLabel();
    renderLabelList();
  };

  renameLabel = async function(oldName) {
    if (!globalLabels[oldName]) return;
    const usage = currentUsage();
    const count = usage.get(oldName) || 0;
    const newName = await promptText(t("renameLabel"), t("renameSyncHint", { count }), oldName);
    if (!newName || newName === oldName) return;

    const exists = !!globalLabels[newName];
    const message = exists
      ? t("renameExistingMsg", { newName: escapeHtml(newName), oldName: escapeHtml(oldName), count })
      : t("renameMsg", { oldName: escapeHtml(oldName), newName: escapeHtml(newName), count });
    if (!await confirmModal(t("confirmRename"), message, exists ? t("mergeRename") : t("renameAction"))) return;

    if (count > 0 && state.data) pushHistory();
    const oldColor = globalLabels[oldName]?.color || stableColor(oldName);
    if (!exists) globalLabels[newName] = { color: oldColor };
    delete globalLabels[oldName];
    if (state.data) {
      for (const shape of state.data.shapes) if (shape.label === oldName) shape.label = newName;
      ensureHelloLabel();
    }
    if (state.activeLabel === oldName) state.activeLabel = newName;
    persistGlobalLabels();

    if (count > 0 && state.data) {
      markDirty(t("renameSynced"));
      renderAll();
    } else {
      renderLabelList();
      if (state.data) {
        buildRenderCache();
        buildLabelAtlas();
        scheduleViewportRender();
      }
      setStatus(t("renameSynced"));
    }
  };

  deleteLabel = async function(name) {
    if (!globalLabels[name]) return;
    const usage = currentUsage();
    const count = usage.get(name) || 0;

    if (count === 0) {
      if (!await confirmModal(t("deleteLabel"), t("deleteLabelConfirm", { name: escapeHtml(name) }), t("deleteAction"), true)) return;
      delete globalLabels[name];
      if (state.activeLabel === name) state.activeLabel = null;
      persistGlobalLabels();
      if (state.data) ensureHelloLabel();
      renderLabelList();
      setStatus(t("labelDeleted", { name }));
      return;
    }

    const alternatives = Object.keys(globalLabels).filter(label => label !== name);
    const body = `<div class="danger-note">${t("labelInUse", { name: escapeHtml(name), count })}</div><label>${escapeHtml(t("replacementLabel"))}<select id="replacementLabel"><option value="">${escapeHtml(t("choosePlaceholder"))}</option>${alternatives.map(label => `<option value="${escapeHtml(label)}">${escapeHtml(label)}</option>`).join("")}</select></label><label style="display:block;margin-top:10px">${escapeHtml(t("newReplacement"))}<input id="replacementNew" type="text" placeholder="${escapeHtml(t("newLabelName"))}" /></label><label style="display:flex;gap:7px;align-items:center;margin-top:12px;color:var(--danger)"><input id="deleteAssociated" type="checkbox" /> ${escapeHtml(t("deleteAssociated", { count }))}</label>`;
    const result = await showModal({
      title: t("deleteLabel"),
      body,
      buttons: [
        { label: t("cancel"), value: null },
        { label: t("execute"), value: "ok", className: "primary" }
      ]
    });
    if (result !== "ok") return;

    const remove = !!$("deleteAssociated")?.checked;
    const replacement = String($("replacementNew")?.value || "").trim() || String($("replacementLabel")?.value || "");
    if (!remove && !replacement) {
      alert(t("chooseReplacement"));
      return;
    }

    pushHistory();
    if (remove) {
      const oldIds = [...shapeIds()];
      for (let index = state.data.shapes.length - 1; index >= 0; index--) {
        if (state.data.shapes[index].label !== name) continue;
        const id = oldIds[index];
        state.data.shapes.splice(index, 1);
        state.runtimeIds.splice(index, 1);
        delete state.runtimeMeta[id];
      }
    } else {
      if (!globalLabels[replacement]) globalLabels[replacement] = { color: stableColor(replacement) };
      for (const shape of state.data.shapes) if (shape.label === name) shape.label = replacement;
    }

    delete globalLabels[name];
    if (state.activeLabel === name) state.activeLabel = remove ? null : replacement;
    persistGlobalLabels();
    ensureHelloLabel();
    clearSelection();
    markDirty(remove ? t("labelAndInstancesDeleted", { name, count }) : t("instancesReplaced", { count, replacement }));
    renderAll();
  };

  // New labels typed while creating a shape are added through commitGeometry.
  // Persist the shared map whenever normal annotation changes run through markDirty.
  const originalMarkDirty = markDirty;
  markDirty = function(...args) {
    persistGlobalLabels();
    return originalMarkDirty(...args);
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
