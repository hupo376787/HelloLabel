"use strict";

// Unified mobile toolbar state controller.
// Drawing tools report state here; UI decides which buttons are visible.
(() => {
  const profiles = {
    idle: {
      undo: false,
      finish: false,
      cancel: false,
      edit: false,
      remove: false,
    },
    polygon: (s) => ({
      undo: s.pointCount > 0,
      finish: s.pointCount >= 3,
      cancel: true,
      edit: false,
      remove: false,
    }),
    polyline: (s) => ({
      undo: s.pointCount > 1,
      finish: s.pointCount >= 2,
      cancel: true,
      edit: false,
      remove: false,
    }),
    rectangle: () => ({
      undo: false,
      finish: false,
      cancel: true,
      edit: false,
      remove: false,
    }),
    circle: () => ({
      undo: false,
      finish: false,
      cancel: true,
      edit: false,
      remove: false,
    }),
    oriented_rectangle: (s) => ({
      undo: false,
      finish: s.phase === "width",
      cancel: true,
      edit: false,
      remove: false,
    }),
    brush: () => ({
      undo: false,
      finish: true,
      cancel: true,
      edit: false,
      remove: false,
    }),
    selected: () => ({
      undo: false,
      finish: false,
      cancel: false,
      edit: true,
      remove: true,
    }),
  };

  function resolveActions(state) {
    const profile = profiles[state.tool] || profiles.idle;
    return typeof profile === "function" ? profile(state) : profile;
  }

  function updateToolbar(state = {}) {
    const actions = resolveActions(state);
    const ui = window.mobileTouchUI;
    if (!ui) return actions;

    ui.showAction("undo", actions.undo);
    ui.showAction("finish", actions.finish);
    ui.showAction("cancel", actions.cancel);

    const finish = document.querySelector('[data-touch-action="finish"]');
    const undo = document.querySelector('[data-touch-action="undo"]');
    const cancel = document.querySelector('[data-touch-action="cancel"]');

    if (finish) {
      finish.textContent = state.tool === "polygon" || state.tool === "polyline"
        ? `✓ 完成${state.pointCount ? ` (${state.pointCount})` : ""}`
        : "✓ 完成";
      finish.disabled = !actions.finish;
    }

    if (undo) {
      undo.textContent = state.tool === "polygon" || state.tool === "polyline"
        ? "↶ 撤销一点"
        : "↶ 撤销";
    }

    if (cancel) {
      cancel.textContent = "× 取消";
    }

    return actions;
  }

  window.mobileToolbarState = {
    update: updateToolbar,
    resolve: resolveActions,
    profiles,
  };
})();
