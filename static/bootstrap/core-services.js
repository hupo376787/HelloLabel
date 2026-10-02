"use strict";

window.HelloLabelModel.configure({
  state,
  deepClone,
  uid,
  stableColor,
  SHAPE_TYPES,
  t
});

window.HelloLabelStatusUI.configure({state,els,t,primaryShape});

window.HelloLabelHistory.configure({
  state,deepClone,ensureHelloLabel,clearSelection,t,renderAll,updateActionButtons,
  setSaveState,setStatus,saveJsonToFolder
});

window.HelloLabelJsonStorage.configure({
  state,ensureDataImageFields,ensureHelloLabel,stemOf,setSaveState,t,setStatus,
  updateActionButtons,els,scheduleAutoSave,confirmModal,escapeHtml,
  createEmptyLabelme,renderFileList,renderAll,validateLabelme,siblingJsonHandle
});

window.HelloLabelFolder.configure({
  state,els,flushPendingSave,setStatus,t,
  resetCurrentState:()=>window.HelloLabelFolder.resetCurrentState(),
  isImage,stemOf,escapeHtml,responseError,setSaveState,setBusy,validateLabelme,
  createEmptyLabelme,ensureDataImageFields,ensureHelloLabel,renderAll,enableImageUi,
  resizeOverlay,fitToWindow,updateSelectionPanel,updateActionButtons
});
