"use strict";

const $ = window.HelloLabelDOM.$;
const els = window.HelloLabelDOM.createElements();
const {
  IMAGE_EXTS,
  SHAPE_TYPES,
  HIT_GRID,
  INSTANCE_ROW_H,
  INSTANCE_OVERSCAN,
  CANVAS_MAX_DPR,
  LABEL_ATLAS_W,
  OUTLINE_PX,
  POINT_PX,
  LABEL_FONT_PX
} = window.HelloLabelConstants;
const MODE_BUTTONS = {
  pointer:els.pointerBtn,
  pen:els.penBtn,
  polygon:els.polygonBtn,
  rectangle:els.rectBtn,
  oriented_rectangle:els.obbBtn,
  circle:els.circleBtn,
  point:els.pointBtn,
  line:els.lineBtn,
  linestrip:els.linestripBtn,
  sam:els.samModeBtn
};


Object.assign(I18N.zh,{
  mainMenu:"主菜单",menuFile:"文件",menuView:"视图",menuEdit:"编辑",menuAI:"AI",menuSettings:"设置",menuAbout:"关于",menuClose:"关闭窗口",installAI:"安装 AI",installAIConfirmTitle:"安装 AI 依赖",installAIConfirmText:"安装 AI 会先关闭当前 HelloLabel 后端并启动独立安装窗口。桌面安装版会使用程序自带 Python 创建 HelloLabel 私有 AI Runtime，不需要系统 Python；源码版仍使用项目 .venv。安装完成后请重新启动 HelloLabel。是否继续？",installAILaunching:"正在启动 AI 安装程序…",installAIStarted:"AI 安装程序正在启动。HelloLabel 将关闭；请在独立安装窗口中等待完成，然后重新启动 HelloLabel。",installAIUnavailable:"当前运行环境无法启动 HelloLabel AI 安装程序。",installAIError:"启动 AI 安装程序失败：{message}",menuLeftPanel:"左侧图片栏",menuRightPanel:"右侧标注栏",menuTheme:"切换主题",menuAboutHelloLabel:"关于 HelloLabel",collapseLeftPanel:"折叠/展开左侧图片栏",collapseRightPanel:"折叠/展开右侧标注栏",aboutText:"HelloLabel · AI 辅助图像标注工具\n兼容 Labelme JSON，支持 WebGL2 高性能标注、SAM / YOLO 辅助标注。",shortcutsText:"V 指针 · B 画笔 · P 多边形 · R 矩形 · O 有向矩形 · C 圆形 · D 点 · L 直线 · K 折线\nCtrl+O 打开文件夹 · Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Y 重做"
});
Object.assign(I18N.en,{
  mainMenu:"Main menu",menuFile:"File",menuView:"View",menuEdit:"Edit",menuAI:"AI",menuSettings:"Settings",menuAbout:"About",menuClose:"Close window",installAI:"Install AI",installAIConfirmTitle:"Install AI dependencies",installAIConfirmText:"Installing AI will stop the current HelloLabel backend and open a separate installer. Packaged desktop builds use HelloLabel’s bundled Python to create a private AI runtime, so no system Python is required; source mode continues to use the project .venv. Restart HelloLabel when installation finishes. Continue?",installAILaunching:"Launching the AI installer…",installAIStarted:"The AI installer is starting. HelloLabel will close; wait for the separate installer window to finish, then restart HelloLabel.",installAIUnavailable:"This environment could not start the HelloLabel AI installer.",installAIError:"Failed to start the AI installer: {message}",menuLeftPanel:"Left image panel",menuRightPanel:"Right annotation panel",menuTheme:"Switch theme",menuAboutHelloLabel:"About HelloLabel",collapseLeftPanel:"Collapse/expand left image panel",collapseRightPanel:"Collapse/expand right annotation panel",aboutText:"HelloLabel · AI-assisted image annotation\nLabelme-compatible JSON, WebGL2 rendering, SAM / YOLO assisted annotation.",shortcutsText:"V Pointer · B Brush · P Polygon · R Rectangle · O Oriented Rectangle · C Circle · D Point · L Line · K Polyline\nCtrl+O Open folder · Ctrl+S Save · Ctrl+Z Undo · Ctrl+Y Redo"
});
const {currentLanguage,t,shapeTypeText}=window.HelloLabelI18n;
const {
  deepClone,escapeHtml,stemOf,extOf,isImage,clamp,dist2,uid,
  hashString,hslToHex,stableColor,hexToRgba
}=window.HelloLabelUtils;

const state=window.HelloLabelState.create({language:currentLanguage()});

window.HelloLabelModel.configure({
  state,
  deepClone,
  uid,
  stableColor,
  SHAPE_TYPES,
  t
});
const {
  ensureHelloLabel,
  shapeIds,
  shapeMeta,
  labelColor,
  shapeAtId,
  primaryShape,
  primaryIndex,
  createEmptyLabelme,
  validateLabelme,
  ensureDataImageFields
}=window.HelloLabelModel;

window.HelloLabelStatusUI.configure({state,els,t,primaryShape});
function setStatus(text,error=false){return window.HelloLabelStatusUI.setStatus(text,error);}
function setBusy(on,text=t("processing")){return window.HelloLabelStatusUI.setBusy(on,text);}
function setSaveState(text,kind=""){return window.HelloLabelStatusUI.setSaveState(text,kind);}
function responseError(res){return window.HelloLabelStatusUI.responseError(res);}
function updateActionButtons(){return window.HelloLabelStatusUI.updateActionButtons();}
function enableImageUi(on){return window.HelloLabelStatusUI.enableImageUi(on);}

window.HelloLabelHistory.configure({
  state,deepClone,ensureHelloLabel,clearSelection,t,renderAll,updateActionButtons,
  setSaveState,setStatus,saveJsonToFolder
});
function pushHistory(){return window.HelloLabelHistory.pushHistory();}
function restoreSnapshot(snapshot){return window.HelloLabelHistory.restoreSnapshot(snapshot);}
function undo(){return window.HelloLabelHistory.undo();}
function redo(){return window.HelloLabelHistory.redo();}
function markDirty(status=t("modifiedWaiting")){return window.HelloLabelHistory.markDirty(status);}
function scheduleAutoSave(){return window.HelloLabelHistory.scheduleAutoSave();}
function flushPendingSave(){return window.HelloLabelHistory.flushPendingSave();}

window.HelloLabelJsonStorage.configure({
  state,ensureDataImageFields,ensureHelloLabel,stemOf,setSaveState,t,setStatus,
  updateActionButtons,els,scheduleAutoSave,confirmModal,escapeHtml,
  createEmptyLabelme,renderFileList,renderAll
});
function saveJsonToFolder(showMessage=true){return window.HelloLabelJsonStorage.saveJsonToFolder(showMessage);}
function deleteCurrentJson(){return window.HelloLabelJsonStorage.deleteCurrentJson();}

window.HelloLabelFolder.configure({
  state,els,flushPendingSave,setStatus,t,
  resetCurrentState:()=>window.HelloLabelFolder.resetCurrentState(),
  isImage,stemOf,escapeHtml,responseError,setSaveState,setBusy,validateLabelme,
  createEmptyLabelme,ensureDataImageFields,ensureHelloLabel,renderAll,enableImageUi,
  resizeOverlay,fitToWindow,updateSelectionPanel,updateActionButtons
});
function requestFolder(){return window.HelloLabelFolder.requestFolder();}
function refreshFolderEntries(){return window.HelloLabelFolder.refreshFolderEntries();}
function renderFileList(){return window.HelloLabelFolder.renderFileList();}
function siblingJsonHandle(imageName,create=false){return window.HelloLabelFolder.siblingJsonHandle(imageName,create);}
function markActiveFile(name){return window.HelloLabelFolder.markActiveFile(name);}
function resetCurrentState(){return window.HelloLabelFolder.resetCurrentState();}
function loadPreview(file){return window.HelloLabelFolder.loadPreview(file);}
function openImageEntry(entry){return window.HelloLabelFolder.openImageEntry(entry);}

// ---------- Geometry + WebGL2 renderer ----------
const {
  rectCorners,circleInfo,renderVertices,isClosedType,shapeBounds,shapeAnchor,
  controlPointsForShape,pointSegDistance,shapeHit
}=window.HelloLabelGeometry;

window.HelloLabelWebGL.configure({
  state,els,setStatus,t,CANVAS_MAX_DPR,OUTLINE_PX,POINT_PX
});
function resizeOverlay(){return window.HelloLabelWebGL.resizeOverlay();}
function initRenderer(){return window.HelloLabelWebGL.initRenderer();}

window.HelloLabelRenderCache.configure({
  state,HIT_GRID,LABEL_FONT_PX,LABEL_ATLAS_W,shapeIds,shapeBounds,initRenderer,
  hexToRgba,labelColor,renderVertices,isClosedType,shapeAnchor,els
});
function buildRenderCache(excludeIds=null){return window.HelloLabelRenderCache.buildRenderCache(excludeIds);}
function buildLabelAtlas(){return window.HelloLabelRenderCache.buildLabelAtlas();}
function shouldWebglShowLabels(){return window.HelloLabelRenderCache.shouldWebglShowLabels();}

window.HelloLabelViewportRenderer.configure({
  state,els,clamp,OUTLINE_PX,POINT_PX,LABEL_FONT_PX,resizeOverlay,labelColor,
  renderVertices,isClosedType,shapeAnchor,shouldWebglShowLabels,
  renderSelectedOverlay,renderDrawingOverlay,renderSamOverlay
});
function scheduleViewportRender(){return window.HelloLabelViewportRenderer.scheduleViewportRender();}
function imageToViewport(x,y){return window.HelloLabelViewportRenderer.imageToViewport(x,y);}
function screenToImage(clientX,clientY){return window.HelloLabelViewportRenderer.screenToImage(clientX,clientY);}
function pointerProfile(pointerType=null){return window.HelloLabelViewportRenderer.pointerProfile(pointerType);}
function clampImagePoint(point){return window.HelloLabelViewportRenderer.clampImagePoint(point);}

window.HelloLabelSelectionOverlay.configure({
  state,els,imageToViewport,circleInfo,renderVertices,isClosedType,primaryShape,
  controlPointsForShape,shouldWebglShowLabels,shapeAnchor,labelColor
});
function shapeScreenPath(shape){return window.HelloLabelSelectionOverlay.shapeScreenPath(shape);}
function renderSelectedOverlay(){return window.HelloLabelSelectionOverlay.renderSelectedOverlay();}
function flashSelected(){return window.HelloLabelSelectionOverlay.flashSelected();}

window.HelloLabelHitTest.configure({
  state,HIT_GRID,pointerProfile,shapeAtId,shapeHit
});
function findShapeAt(x,y,pointerType=null){return window.HelloLabelHitTest.findShapeAt(x,y,pointerType);}

// ---------- Labels, instances, selection ----------
window.HelloLabelModal.configure({state,els,escapeHtml,t,$,labelColor});
function showModal(options){return window.HelloLabelModal.showModal(options);}
function closeModal(value=null){return window.HelloLabelModal.closeModal(value);}
function promptText(title,message,value=""){return window.HelloLabelModal.promptText(title,message,value);}
function confirmModal(title,message,confirmText=t("ok"),danger=false){return window.HelloLabelModal.confirmModal(title,message,confirmText,danger);}
function chooseLabelModal(){return window.HelloLabelModal.chooseLabelModal();}

window.HelloLabelLabels.configure({
  state,els,t,setStatus,pushHistory,markDirty,buildRenderCache,buildLabelAtlas,
  renderSelectedOverlay,scheduleViewportRender,chooseLabelModal,promptText,stableColor,
  escapeHtml,confirmModal,renderAll,showModal,$,shapeIds,clearSelection
});
function labelUsage(){return window.HelloLabelLabels.labelUsage();}
function renderLabelList(){return window.HelloLabelLabels.renderLabelList();}
function changeLabelColor(name,color){return window.HelloLabelLabels.changeLabelColor(name,color);}
function resolveNewShapeLabel(){return window.HelloLabelLabels.resolveNewShapeLabel();}
function addLabel(){return window.HelloLabelLabels.addLabel();}
function renameLabel(oldName){return window.HelloLabelLabels.renameLabel(oldName);}
function deleteLabel(name){return window.HelloLabelLabels.deleteLabel(name);}

window.HelloLabelInstances.configure({
  state,els,shapeIds,INSTANCE_ROW_H,INSTANCE_OVERSCAN,shapeAtId,escapeHtml,shapeTypeText
});
function rebuildInstanceList(){return window.HelloLabelInstances.rebuildInstanceList();}
function scheduleInstanceListRender(){return window.HelloLabelInstances.scheduleInstanceListRender();}
function renderInstanceListWindow(){return window.HelloLabelInstances.renderInstanceListWindow();}
function scrollInstanceToId(id){return window.HelloLabelInstances.scrollInstanceToId(id);}

window.HelloLabelSelection.configure({
  state,els,updateSelectionPanel,renderSelectedOverlay,scheduleInstanceListRender,
  updateActionButtons,scrollInstanceToId,primaryShape,shapeAtId,imageToViewport,
  shapeAnchor,scheduleViewportRender,primaryIndex,shapeMeta,shapeTypeText,t
});
function clearSelection(){return window.HelloLabelSelection.clearSelection();}
function selectId(id,options={}){return window.HelloLabelSelection.selectId(id,options);}
function ensureShapeVisible(id){return window.HelloLabelSelection.ensureShapeVisible(id);}
function updateSelectionPanel(){return window.HelloLabelSelection.updateSelectionPanel();}

window.HelloLabelRenderAll.configure({
  state,ensureHelloLabel,ensureDataImageFields,buildRenderCache,buildLabelAtlas,
  renderLabelList,rebuildInstanceList,updateSelectionPanel,updateActionButtons,scheduleViewportRender
});
function renderAll(options={}){return window.HelloLabelRenderAll.renderAll(options);}

// ---------- Manual drawing + pointer editing ----------
window.HelloLabelAnnotationCommit.configure({
  state,
  resolveNewShapeLabel,
  setStatus,
  t,
  pushHistory,
  stableColor,
  uid,
  markDirty,
  shapeTypeText,
  renderAll,
  selectId,
  renderDrawingOverlay
});
function roundCoord(value){return window.HelloLabelAnnotationCommit.roundCoord(value);}
function makeShape(label,type,points){return window.HelloLabelAnnotationCommit.makeShape(label,type,points);}
function commitGeometry(type,points,meta){return window.HelloLabelAnnotationCommit.commitGeometry(type,points,meta);}
function cancelDrawing(status=true){return window.HelloLabelAnnotationCommit.cancelDrawing(status);}

function orientedRectFromEdge(a,b,c){return window.HelloLabelObbTool.fromEdge(a,b,c);}
window.HelloLabelDrawingPreview.configure({
  state,
  els,
  makeShape,
  orientedRectFromEdge,
  shapeScreenPath,
  isClosedType,
  imageToViewport
});
function renderDrawingOverlay(){return window.HelloLabelDrawingPreview.render();}

function finishSequenceDrawing(){return window.HelloLabelAnnotationCommit.finishSequenceDrawing();}
function handleDrawPointerDown(ev){return window.HelloLabelDrawingDispatcher.pointerDown(ev);}
function handleDrawPointerMove(ev){return window.HelloLabelDrawingDispatcher.pointerMove(ev);}
function handleDrawPointerUp(ev){return window.HelloLabelDrawingDispatcher.pointerUp(ev);}

window.HelloLabelPolygonTool.configure({state,renderDrawingOverlay,setStatus,t,shapeTypeText});
window.HelloLabelRectangleTool.configure({state,renderDrawingOverlay,setStatus,t,dist2,shapeTypeText,commitGeometry});
window.HelloLabelBrushTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});
window.HelloLabelObbTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});
window.HelloLabelCircleTool.configure({state,renderDrawingOverlay,setStatus,t,dist2,shapeTypeText,commitGeometry});
window.HelloLabelLineTool.configure({state,setStatus,t,renderDrawingOverlay,finishSequenceDrawing});
window.HelloLabelPointTool.configure({commitGeometry});
window.HelloLabelDrawingDispatcher.configure({
  state,
  clampImagePoint,
  screenToImage,
  tools:{
    pen:window.HelloLabelBrushTool,
    polygon:window.HelloLabelPolygonTool,
    linestrip:window.HelloLabelPolygonTool,
    rectangle:window.HelloLabelRectangleTool,
    oriented_rectangle:window.HelloLabelObbTool,
    circle:window.HelloLabelCircleTool,
    line:window.HelloLabelLineTool,
    point:window.HelloLabelPointTool
  }
});
window.HelloLabelPointerTool.configure({
  state,els,clampImagePoint,screenToImage,rectCorners,primaryShape,pointerProfile,controlPointsForShape,
  selectId,deepClone,shapeAtId,findShapeAt,clearSelection,pushHistory,buildRenderCache,buildLabelAtlas,
  renderSelectedOverlay,scheduleViewportRender,markDirty,t,renderAll
});
function beginPointerEdit(ev){return window.HelloLabelPointerTool.begin(ev);}
function movePointerEdit(ev){return window.HelloLabelPointerTool.move(ev);}
function endPointerEdit(){return window.HelloLabelPointerTool.end();}
function cancelPointerEdit(){return window.HelloLabelPointerTool.cancel();}
window.HelloLabelEditCommands.configure({
  state,primaryShape,pointSegDistance,pointerProfile,clampImagePoint,screenToImage,
  pushHistory,markDirty,t,renderAll,selectId,shapeIds,clearSelection
});
function nearestEditableSegment(shape,point,pointerType=null){return window.HelloLabelEditCommands.nearestEditableSegment(shape,point,pointerType);}
function insertVertexAtDoubleClick(event){return window.HelloLabelEditCommands.insertVertexAtDoubleClick(event);}
function deleteActiveVertex(){return window.HelloLabelEditCommands.deleteActiveVertex();}
function deleteSelected(){return window.HelloLabelEditCommands.deleteSelected();}

// ---------- AI assisted annotation ----------
window.HelloLabelSamController.configure({
  state,els,setMode,setStatus,t,imageToViewport,shapeScreenPath,setBusy,responseError,
  clampImagePoint,screenToImage,deepClone,commitGeometry
});
function resetSamState(){return window.HelloLabelSamController.reset();}
function cancelSam(status=true){return window.HelloLabelSamController.cancel(status);}
function rebuildSamPromptsFromHistory(){return window.HelloLabelSamController.rebuildPrompts();}
function renderSamOverlay(){return window.HelloLabelSamController.render();}
function runSamPrediction(){return window.HelloLabelSamController.predict();}
function samPointerDown(ev){return window.HelloLabelSamController.pointerDown(ev);}
function samPointerMove(ev){return window.HelloLabelSamController.pointerMove(ev);}
function samPointerUp(ev){return window.HelloLabelSamController.pointerUp(ev);}
function samUndoPrompt(){return window.HelloLabelSamController.undoPrompt();}
function acceptSam(){return window.HelloLabelSamController.accept();}

window.HelloLabelYoloController.configure({
  state,els,t,setBusy,responseError,pushHistory,stableColor,uid,makeShape,
  markDirty,renderAll,selectId,shapeIds,setStatus,escapeHtml,showModal
});
function runYolo(){return window.HelloLabelYoloController.run();}
function updateYoloUi(){return window.HelloLabelYoloController.updateUi();}
function showModelStatus(){return window.HelloLabelYoloController.showModelStatus();}

// ---------- View transform, display, modes ----------
window.HelloLabelLanguageTheme.configure({
  state,els,t,updateYoloUi,renderFileList,renderLabelList,rebuildInstanceList,updateSelectionPanel,
  setSaveState,setStatus,buildLabelAtlas,scheduleViewportRender
});
function applyLanguage(lang,persist=true){return window.HelloLabelLanguageTheme.applyLanguage(lang,persist);}
function currentTheme(){return window.HelloLabelLanguageTheme.currentTheme();}
function themeIconSvg(mode){return window.HelloLabelLanguageTheme.themeIconSvg(mode);}
function applyTheme(mode,persist=true){return window.HelloLabelLanguageTheme.applyTheme(mode,persist);}
function cycleTheme(){return window.HelloLabelLanguageTheme.cycleTheme();}

window.HelloLabelLayout.configure({
  state,els,cancelSam,resizeOverlay,scheduleViewportRender,scheduleInstanceListRender
});
function currentAiToolbarVisible(){return window.HelloLabelLayout.currentAiToolbarVisible();}
function applyAiToolbarVisibility(visible,persist=true){return window.HelloLabelLayout.applyAiToolbarVisibility(visible,persist);}
function currentPanelVisible(side){return window.HelloLabelLayout.currentPanelVisible(side);}
function updatePanelToggleUi(){return window.HelloLabelLayout.updatePanelToggleUi();}
function applyPanelVisibility(side,visible,persist=true){return window.HelloLabelLayout.applyPanelVisibility(side,visible,persist);}
function togglePanel(side){return window.HelloLabelLayout.togglePanel(side);}
function closeAppMenu(){return window.HelloLabelLayout.closeAppMenu();}
function toggleAppMenu(){return window.HelloLabelLayout.toggleAppMenu();}

window.HelloLabelViewport.configure({state,els,clamp,scheduleViewportRender});
function applyImageDisplay(){return window.HelloLabelViewport.applyImageDisplay();}
function resetDisplay(){return window.HelloLabelViewport.resetDisplay();}
function fitToWindow(){return window.HelloLabelViewport.fitToWindow();}
function actualSize(){return window.HelloLabelViewport.actualSize();}
function zoomAt(factor,clientX=null,clientY=null){return window.HelloLabelViewport.zoomAt(factor,clientX,clientY);}
function startPan(ev){return window.HelloLabelViewport.startPan(ev);}
function movePan(ev){return window.HelloLabelViewport.movePan(ev);}
function endPan(){return window.HelloLabelViewport.endPan();}

window.HelloLabelHelpMenu.configure({
  state,showModal,t,escapeHtml,confirmModal,setStatus,closeAppMenu,requestFolder,
  saveJsonToFolder,setSaveState,deleteCurrentJson,togglePanel,applyAiToolbarVisibility,
  installAI:()=>window.HelloLabelHelpMenu.installAIFromMenu(),
  fitToWindow,actualSize,undo,redo,deleteSelected,applyLanguage,cycleTheme,showModelStatus
});
function showAbout(){return window.HelloLabelHelpMenu.showAbout();}
function showShortcuts(){return window.HelloLabelHelpMenu.showShortcuts();}
function installAIFromMenu(){return window.HelloLabelHelpMenu.installAIFromMenu();}
function runMenuCommand(cmd){return window.HelloLabelHelpMenu.runMenuCommand(cmd);}

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
function setMode(mode, options={}) {
  return window.HelloLabelMode.set(mode, options);
}

// ---------- Events ----------
window.HelloLabelUiEvents.configure({
  state,els,requestFolder,togglePanel,toggleAppMenu,runMenuCommand,closeAppMenu,
  MODE_BUTTONS,setMode,deleteSelected,undo,redo,saveJsonToFolder,setSaveState,t,setStatus,
  deleteCurrentJson,fitToWindow,actualSize,zoomAt,scheduleViewportRender,cycleTheme,
  applyAiToolbarVisibility,applyLanguage,renderFileList,addLabel,scheduleInstanceListRender,
  selectId,flashSelected,applyImageDisplay,resetDisplay,acceptSam,cancelSam,runSamPrediction,
  resetSamState,updateYoloUi,runYolo,showModelStatus,closeModal
});
window.HelloLabelUiEvents.bind();

window.HelloLabelViewportEvents.configure({
  state,els,zoomAt,startPan,samPointerDown,beginPointerEdit,handleDrawPointerDown,
  movePan,samPointerMove,movePointerEdit,handleDrawPointerMove,endPan,samPointerUp,
  endPointerEdit,handleDrawPointerUp,cancelPointerEdit,renderSamOverlay,
  insertVertexAtDoubleClick,dist2,finishSequenceDrawing,resizeOverlay,
  scheduleViewportRender,scheduleInstanceListRender
});
window.HelloLabelViewportEvents.bind();

window.HelloLabelKeyboardEvents.configure({
  state,els,closeModal,cancelSam,cancelDrawing,acceptSam,orientedRectFromEdge,
  finishSequenceDrawing,samUndoPrompt,deleteSelected,saveJsonToFolder,setSaveState,
  t,setStatus,requestFolder,undo,redo,setMode,currentTheme,applyTheme
});
window.HelloLabelKeyboardEvents.bind();

window.HelloLabelAppInitializer.configure({
  state,currentPanelVisible,updatePanelToggleUi,applyAiToolbarVisibility,
  currentAiToolbarVisible,applyLanguage,currentLanguage,initRenderer,
  applyImageDisplay,updateYoloUi,updateActionButtons,setStatus,t
});
window.HelloLabelAppInitializer.init();
