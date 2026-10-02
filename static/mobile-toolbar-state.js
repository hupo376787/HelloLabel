"use strict";

// Drawing tools report state here. The pointer-input layer owns the single
// touch action bar; this controller only translates state changes and asks it
// to refresh.
(() => {
  const profiles = {
    idle: { undo:false, finish:false, cancel:false, edit:false, remove:false },
    polygon: s => ({ undo:s.pointCount>0, finish:s.pointCount>=3, cancel:true, edit:false, remove:false }),
    polyline: s => ({ undo:s.pointCount>1, finish:s.pointCount>=2, cancel:true, edit:false, remove:false }),
    rectangle: () => ({ undo:false, finish:false, cancel:true, edit:false, remove:false }),
    circle: () => ({ undo:false, finish:false, cancel:true, edit:false, remove:false }),
    oriented_rectangle: s => ({ undo:false, finish:s.phase==="width", cancel:true, edit:false, remove:false }),
    brush: () => ({ undo:false, finish:true, cancel:true, edit:false, remove:false }),
    selected: () => ({ undo:false, finish:false, cancel:false, edit:true, remove:true }),
  };

  function resolveActions(state) {
    const profile = profiles[state.tool] || profiles.idle;
    return typeof profile === "function" ? profile(state) : profile;
  }

  let currentState = { tool:"idle" };

  function update(state = {}) {
    currentState = { ...currentState, ...state };
    const actions = resolveActions(currentState);
    window.helloLabelPointerInput?.refreshTouchActions?.();
    return actions;
  }

  window.addEventListener("hellolabel:drawing-state", event => {
    if (event.detail) update(event.detail);
  });

  window.mobileToolbarState = {
    update,
    resolve:resolveActions,
    profiles,
    getState:() => ({ ...currentState }),
  };
})();
