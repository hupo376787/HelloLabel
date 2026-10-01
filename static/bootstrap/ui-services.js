"use strict";

window.HelloLabelModal.configure({state,els,escapeHtml,t,$,labelColor});

window.HelloLabelLabels.configure({
  state,els,t,setStatus,pushHistory,markDirty,buildRenderCache,buildLabelAtlas,
  renderSelectedOverlay,scheduleViewportRender,chooseLabelModal,promptText,stableColor,
  escapeHtml,confirmModal,renderAll,showModal,$,shapeIds,clearSelection
});

window.HelloLabelInstances.configure({
  state,els,shapeIds,INSTANCE_ROW_H,INSTANCE_OVERSCAN,shapeAtId,escapeHtml,shapeTypeText
});

window.HelloLabelSelection.configure({
  state,els,updateSelectionPanel,renderSelectedOverlay,scheduleInstanceListRender,
  updateActionButtons,scrollInstanceToId,primaryShape,shapeAtId,imageToViewport,
  shapeAnchor,scheduleViewportRender,primaryIndex,shapeMeta,shapeTypeText,t
});

window.HelloLabelRenderAll.configure({
  state,ensureHelloLabel,ensureDataImageFields,buildRenderCache,buildLabelAtlas,
  renderLabelList,rebuildInstanceList,updateSelectionPanel,updateActionButtons,scheduleViewportRender
});
