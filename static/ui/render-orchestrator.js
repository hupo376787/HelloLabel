"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function renderAll({excludeSelected=false}={}) {
    const {
      state,ensureHelloLabel,ensureDataImageFields,buildRenderCache,buildLabelAtlas,
      renderLabelList,rebuildInstanceList,updateSelectionPanel,updateActionButtons,
      scheduleViewportRender
    }=c;

    if(!state.data)return;
    ensureHelloLabel();
    ensureDataImageFields();
    const exclude=excludeSelected&&state.primaryId?new Set([state.primaryId]):null;
    buildRenderCache(exclude);
    buildLabelAtlas();
    renderLabelList();
    rebuildInstanceList();
    updateSelectionPanel();
    updateActionButtons();
    scheduleViewportRender();
  }

  const api={configure,renderAll};
  window.HelloLabelRenderAll=api;
})();
