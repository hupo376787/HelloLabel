"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  async function run() {
    const {
      state, els, t, setBusy, responseError,
      pushHistory, stableColor, uid, makeShape,
      markDirty, renderAll, selectId, shapeIds, setStatus
    } = c;

    if (!state.imageFile) return;

    const model = els.yoloModelSelect.value;
    if (model === "yolo-world" && !els.yoloTextInput.value.trim()) {
      alert(t("worldNeedText"));
      return;
    }

    setBusy(true, t("inferencing", {
      model:els.yoloModelSelect.options[els.yoloModelSelect.selectedIndex].text
    }));

    try {
      const post = async forceFile => {
        const form = new FormData();
        if (!forceFile && state.aiImageToken) form.append("image_token", state.aiImageToken);
        else form.append("file", state.imageFile, state.imageName);

        form.append("model", model);
        form.append("text", els.yoloTextInput.value.trim());
        form.append("conf", els.yoloConf.value);
        form.append("iou", els.yoloIou.value);
        form.append("output_shape", model === "yolo11-seg" ? els.yoloOutputSelect.value : "rectangle");
        return fetch("/api/ai/yolo", { method:"POST", body:form });
      };

      let response = await post(false);
      if (response.status === 410 && state.aiImageToken) {
        state.aiImageToken = null;
        response = await post(true);
      }
      if (!response.ok) throw new Error(await responseError(response));

      const json = await response.json();
      const items = json.shapes || [];
      if (json.image_token) state.aiImageToken = json.image_token;

      if (!items.length) {
        setStatus(t("noDetections"));
        return;
      }

      pushHistory();
      for (const item of items) {
        const label = String(item.label || "object");
        if (!state.data.hellolabel.labels[label]) {
          state.data.hellolabel.labels[label] = { color:stableColor(label) };
        }

        const id = uid();
        state.data.shapes.push(makeShape(label, item.shape_type, item.points));
        state.runtimeIds.push(id);
        state.runtimeMeta[id] = {
          source:item.model || model,
          score:item.score ?? null
        };
      }

      markDirty(t("aiAdded", { count:items.length }));
      renderAll();
      if (items.length === 1) selectId(shapeIds().at(-1), { scroll:true, ensure:true });
    } catch (error) {
      setStatus(error.message, true);
      alert(t("aiAutoFailed", { message:error.message }));
    } finally {
      setBusy(false);
    }
  }

  function updateUi() {
    const { els, t } = c;
    const model = els.yoloModelSelect.value;
    els.yoloTextInput.disabled = false;
    els.yoloTextInput.placeholder = t(model === "yolo-world" ? "yoloWorldPlaceholder" : "yoloFilterPlaceholder");
    els.yoloTextInput.title = model === "yolo-world" ? t("yoloWorldPlaceholder") : t("yoloFilterPlaceholder");
    els.yoloOutputSelect.disabled = model !== "yolo11-seg";
    els.yoloOutputSelect.title = t(model !== "yolo11-seg" ? "detectOutputTitle" : "segOutputTitle");
  }

  async function showModelStatus() {
    const { setBusy, t, responseError, escapeHtml, showModal } = c;
    setBusy(true, t("readModelStatus"));

    try {
      const response = await fetch("/api/models");
      if (!response.ok) throw new Error(await responseError(response));
      const data = await response.json();

      const rows = (data.models || []).map(model =>
        `<tr><td>${escapeHtml(model.name)}</td><td class="${model.installed?"model-ok":"model-missing"}">${model.installed?t("available"):t("missing")}</td><td>${model.loaded?t("loaded"):t("notLoaded")}</td><td>${escapeHtml(model.detail||"")}</td></tr>`
      ).join("");

      await showModal({
        title:t("aiModelStatus"),
        body:`<table class="model-table"><thead><tr><th>${escapeHtml(t("model"))}</th><th>${escapeHtml(t("installed"))}</th><th>${escapeHtml(t("memory"))}</th><th>${escapeHtml(t("detail"))}</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">${escapeHtml(t("modelStatusNote"))}</p>`,
        buttons:[{label:t("close"),value:"ok",className:"primary"}]
      });
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  const api = { configure, run, updateUi, showModelStatus };
  window.HelloLabelYoloController = api;
})();
