"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  async function run() {
    const browserRun = window.HelloLabelBrowserYoloRuntime?.run;
    if (typeof browserRun === "function") return browserRun();
    const { setStatus, t } = c;
    const detail = "Browser YOLO runtime is not ready.";
    setStatus(detail, true);
    alert(t("aiAutoFailed", { message:detail }));
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
    const browserStatus = window.HelloLabelBrowserRuntimeUI?.showModelStatus;
    if (typeof browserStatus === "function") return browserStatus();
    const { showModal, t, escapeHtml } = c;
    await showModal({
      title:t("aiModelStatus"),
      body:`<div class="danger-note">${escapeHtml("Browser AI runtime is not ready.")}</div>`,
      buttons:[{label:t("close"),value:"ok",className:"primary"}]
    });
  }

  const api = { configure, run, updateUi, showModelStatus };
  window.HelloLabelYoloController = api;
})();
