"use strict";

window.HelloLabelDOM = window.HelloLabelDOM || {};

window.HelloLabelDOM.$ = function(id) {
  return document.getElementById(id);
};

window.HelloLabelDOM.createElements = function() {
  const $ = window.HelloLabelDOM.$;
  return {
  openFolderBtn:$("openFolderBtn"), pointerBtn:$("pointerBtn"), penBtn:$("penBtn"), polygonBtn:$("polygonBtn"), rectBtn:$("rectBtn"), obbBtn:$("obbBtn"), circleBtn:$("circleBtn"), pointBtn:$("pointBtn"), lineBtn:$("lineBtn"), linestripBtn:$("linestripBtn"),
  deleteBtn:$("deleteBtn"), undoBtn:$("undoBtn"), redoBtn:$("redoBtn"), saveBtn:$("saveBtn"), deleteJsonBtn:$("deleteJsonBtn"), fitBtn:$("fitBtn"), actualBtn:$("actualBtn"), zoomOutBtn:$("zoomOutBtn"), zoomInBtn:$("zoomInBtn"), zoomLabel:$("zoomLabel"), showLabelsCheck:$("showLabelsCheck"), labelDisplayMode:$("labelDisplayMode"), aiToolbarToggle:$("aiToolbarToggle"), languageSelect:$("languageSelect"), themeBtn:$("themeBtn"),
  samModelSelect:$("samModelSelect"), samOutputSelect:$("samOutputSelect"), samModeBtn:$("samModeBtn"), samAcceptBtn:$("samAcceptBtn"), samCancelBtn:$("samCancelBtn"), yoloModelSelect:$("yoloModelSelect"), yoloTextInput:$("yoloTextInput"), yoloOutputSelect:$("yoloOutputSelect"), yoloConf:$("yoloConf"), yoloIou:$("yoloIou"), yoloRunBtn:$("yoloRunBtn"), modelStatusBtn:$("modelStatusBtn"),
  folderName:$("folderName"), imageCount:$("imageCount"), fileFilterInput:$("fileFilterInput"), clearFileFilterBtn:$("clearFileFilterBtn"), fileList:$("fileList"), emptyState:$("emptyState"), viewport:$("viewport"), stage:$("stage"), imageView:$("imageView"), shapeCanvas:$("shapeCanvas"), interactionSvg:$("interactionSvg"), selectedPath:$("selectedPath"), controlHandles:$("controlHandles"), drawingPath:$("drawingPath"), drawingStart:$("drawingStart"), aiPreviewPath:$("aiPreviewPath"), samPrompts:$("samPrompts"), samDragBox:$("samDragBox"), selectedLabelText:$("selectedLabelText"), busy:$("busy"), busyText:$("busyText"),
  labelCount:$("labelCount"), addLabelBtn:$("addLabelBtn"), labelList:$("labelList"), instanceCount:$("instanceCount"), instanceList:$("instanceList"), instanceListInner:$("instanceListInner"), brightnessSlider:$("brightnessSlider"), brightnessValue:$("brightnessValue"), contrastSlider:$("contrastSlider"), contrastValue:$("contrastValue"), resetDisplayBtn:$("resetDisplayBtn"),
  noSelection:$("noSelection"), selectionInfo:$("selectionInfo"), selNumber:$("selNumber"), selLabel:$("selLabel"), selType:$("selType"), selPoints:$("selPoints"), selSource:$("selSource"), saveState:$("saveState"), statusText:$("statusText"),
  modalBackdrop:$("modalBackdrop"), modalCard:$("modalCard"), modalTitle:$("modalTitle"), modalBody:$("modalBody"), modalActions:$("modalActions"),
  appGrid:$("appGrid"), leftSidebar:$("leftSidebar"), rightSidebar:$("rightSidebar"), leftSidebarToggle:$("leftSidebarToggle"), rightSidebarToggle:$("rightSidebarToggle"),
  appMenuBtn:$("appMenuBtn"), appMenu:$("appMenu"),
};
};
