"use strict";

(() => {
  const boundButtons = new WeakSet();

  function init({ buttons, setMode } = {}) {
    if (!buttons || typeof setMode !== "function") return;

    for (const [mode, button] of Object.entries(buttons)) {
      if (!button || boundButtons.has(button)) continue;
      button.addEventListener("click", () => setMode(mode));
      boundButtons.add(button);
    }
  }

  window.HelloLabelEvents = { init };
})();
