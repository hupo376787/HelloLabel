"use strict";

window.HelloLabelUiEvents.configure({
  state,els,requestFolder,togglePanel,toggleAppMenu,runMenuCommand,closeAppMenu,
  MODE_BUTTONS,setMode,deleteSelected,undo,redo,saveJsonToFolder,setSaveState,t,setStatus,
  deleteCurrentJson,fitToWindow,actualSize,zoomAt,scheduleViewportRender,cycleTheme,
  applyAiToolbarVisibility,applyLanguage,renderFileList,addLabel,scheduleInstanceListRender,
  selectId,flashSelected,applyImageDisplay,resetDisplay,acceptSam,cancelSam,runSamPrediction,
  resetSamState,updateYoloUi,runYolo,showModelStatus,closeModal
});

window.HelloLabelViewportEvents.configure({
  state,els,zoomAt,startPan,samPointerDown,beginPointerEdit,handleDrawPointerDown,
  movePan,samPointerMove,movePointerEdit,handleDrawPointerMove,endPan,samPointerUp,
  endPointerEdit,handleDrawPointerUp,cancelPointerEdit,renderSamOverlay,
  insertVertexAtDoubleClick,dist2,finishSequenceDrawing,resizeOverlay,
  scheduleViewportRender,scheduleInstanceListRender
});

window.HelloLabelKeyboardEvents.configure({
  state,els,closeModal,cancelSam,cancelDrawing,acceptSam,orientedRectFromEdge,
  finishSequenceDrawing,samUndoPrompt,deleteSelected,saveJsonToFolder,setSaveState,
  t,setStatus,requestFolder,undo,redo,setMode,currentTheme,applyTheme
});

window.HelloLabelUiEvents.bind();
window.HelloLabelViewportEvents.bind();
window.HelloLabelKeyboardEvents.bind();
