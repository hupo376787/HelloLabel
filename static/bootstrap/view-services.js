"use strict";

window.HelloLabelLanguageTheme.configure({
  state,els,t,updateYoloUi,renderFileList,renderLabelList,rebuildInstanceList,updateSelectionPanel,
  setSaveState,setStatus,buildLabelAtlas,scheduleViewportRender
});

window.HelloLabelLayout.configure({
  state,els,cancelSam,resizeOverlay,scheduleViewportRender,scheduleInstanceListRender
});

window.HelloLabelViewport.configure({state,els,clamp,scheduleViewportRender});

window.HelloLabelHelpMenu.configure({
  state,showModal,t,escapeHtml,confirmModal,setStatus,closeAppMenu,requestFolder,
  saveJsonToFolder,setSaveState,deleteCurrentJson,togglePanel,applyAiToolbarVisibility,
  installAI:()=>window.HelloLabelHelpMenu.installAIFromMenu(),
  fitToWindow,actualSize,undo,redo,deleteSelected,applyLanguage,cycleTheme,showModelStatus
});

window.HelloLabelMode.configure({
  state,
  buttons: MODE_BUTTONS,
  viewport: els.viewport,
  cancelDrawing,
  resetSamState,
  renderSelectedOverlay,
  updateActionButtons,
  setStatus,
  t
});
