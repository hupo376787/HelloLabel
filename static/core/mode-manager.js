"use strict";

window.HelloLabelMode = window.HelloLabelMode || {
  currentMode: "pointer",
  buttons: {},

  init(buttons) {
    this.buttons = buttons || {};

    Object.entries(this.buttons).forEach(([mode, btn]) => {
      if (!btn) return;
      btn.addEventListener("click", () => this.set(mode));
    });

    this.set("pointer");
  },

  set(mode) {
    this.currentMode = mode;

    Object.entries(this.buttons).forEach(([key, btn]) => {
      if (!btn) return;
      btn.classList.toggle("active", key === mode);
    });

    window.HelloLabelState?.setMode(mode);
  },

  get() {
    return this.currentMode;
  }
};
