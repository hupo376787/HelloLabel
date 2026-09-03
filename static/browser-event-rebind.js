"use strict";
(() => {
  const legacy = window.__helloLabelLegacyFunctions || {};
  if (els.yoloRunBtn && legacy.runYolo) els.yoloRunBtn.removeEventListener("click", legacy.runYolo);
  if (els.yoloRunBtn) els.yoloRunBtn.addEventListener("click", runYolo);
  if (els.modelStatusBtn && legacy.showModelStatus) els.modelStatusBtn.removeEventListener("click", legacy.showModelStatus);
  if (els.modelStatusBtn) els.modelStatusBtn.addEventListener("click", showModelStatus);
  delete window.__helloLabelLegacyFunctions;
})();
