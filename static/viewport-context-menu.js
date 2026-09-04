"use strict";

(() => {
  const viewport = document.getElementById("viewport");
  if (!viewport) return;

  // Disable only the browser's native context menu inside the image workspace.
  // Do not stop propagation: HelloLabel still needs right-click pointer/context
  // events for features such as SAM negative prompts and geometry editing.
  viewport.addEventListener("contextmenu", event => {
    event.preventDefault();
  }, { capture: true });
})();
