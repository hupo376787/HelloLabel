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
function renderAll({excludeSelected=false}={}){
  if(!state.data)return;ensureHelloLabel();ensureDataImageFields();const ex=excludeSelected&&state.primaryId?new Set([state.primaryId]):null;buildRenderCache(ex);buildLabelAtlas();renderLabelList();rebuildInstanceList();updateSelectionPanel();updateActionButtons();scheduleViewportRender();
}
function labelUsage(){const m=new Map();for(const s of state.data?.shapes||[])m.set(s.label,(m.get(s.label)||0)+1);return m;}
function renderLabelList(){
  if(!state.data){els.labelList.replaceChildren();els.labelCount.textContent="0";return;}const labels=state.data.hellolabel.labels,usage=labelUsage();els.labelList.replaceChildren();const names=Object.keys(labels);els.labelCount.textContent=String(names.length);
  for(const name of names){const row=document.createElement("div");row.className="label-row"+(state.activeLabel===name?" active":"");row.dataset.label=name;
    const color=document.createElement("input");color.type="color";color.className="label-color";color.value=labels[name].color;color.title=t("changeLabelColor");color.addEventListener("click",ev=>ev.stopPropagation());color.addEventListener("change",ev=>{ev.stopPropagation();changeLabelColor(name,color.value);});
    const text=document.createElement("div");text.className="label-name";text.textContent=name;text.title=name;const count=document.createElement("div");count.className="label-count";count.textContent=String(usage.get(name)||0);
    const rename=document.createElement("button");rename.className="icon-btn";rename.title=t("rename");rename.textContent="✎";rename.addEventListener("click",ev=>{ev.stopPropagation();renameLabel(name);});
    const del=document.createElement("button");del.className="icon-btn danger";del.title=t("deleteLabel");del.textContent="×";del.addEventListener("click",ev=>{ev.stopPropagation();deleteLabel(name);});
    row.append(color,text,count,rename,del);row.addEventListener("click",()=>{state.activeLabel=name;renderLabelList();setStatus(t("currentDrawLabel",{name}));});els.labelList.appendChild(row);
  }
}
function changeLabelColor(name,color){if(!state.data?.hellolabel?.labels?.[name])return;pushHistory();state.data.hellolabel.labels[name].color=color;markDirty(t("labelColorChanged",{name}));buildRenderCache();buildLabelAtlas();renderSelectedOverlay();scheduleViewportRender();}

function showModal({title,body,buttons}){
  if(state.modalResolve){state.modalResolve(null);state.modalResolve=null;}els.modalTitle.textContent=title;els.modalBody.innerHTML=body;els.modalActions.replaceChildren();els.modalBackdrop.classList.remove("hidden");els.modalBackdrop.setAttribute("aria-hidden","false");
  return new Promise(resolve=>{state.modalResolve=resolve;for(const b of buttons){const btn=document.createElement("button");btn.textContent=b.label;if(b.className)btn.className=b.className;btn.addEventListener("click",()=>closeModal(b.value));els.modalActions.appendChild(btn);}requestAnimationFrame(()=>els.modalBody.querySelector("input,select,button")?.focus());});
}
function closeModal(value=null){els.modalBackdrop.classList.add("hidden");els.modalBackdrop.setAttribute("aria-hidden","true");const r=state.modalResolve;state.modalResolve=null;if(r)r(value);}
async function promptText(title,message,value=""){const result=await showModal({title,body:`<div>${escapeHtml(message)}</div><input id="modalTextValue" type="text" value="${escapeHtml(value)}" autocomplete="off" />`,buttons:[{label:t("cancel"),value:null},{label:t("ok"),value:"ok",className:"primary"}]});if(result!=="ok")return null;return String($("modalTextValue")?.value||"").trim();}
async function confirmModal(title,message,confirmText=t("ok"),danger=false){return (await showModal({title,body:`<div>${message}</div>`,buttons:[{label:t("cancel"),value:false},{label:confirmText,value:true,className:danger?"danger-button":"primary"}]}))===true;}
async function chooseLabelModal(){
  const labels=Object.keys(state.data?.hellolabel?.labels||{}),html=`<div>${escapeHtml(t("chooseOrCreateLabel"))}</div><div id="modalLabelList" class="modal-label-list">${labels.map(n=>`<div class="modal-label-option" data-label="${escapeHtml(n)}"><span class="dot" style="background:${labelColor(n)}"></span><span>${escapeHtml(n)}</span></div>`).join("")||`<div class="muted">${escapeHtml(t("noLabelsYet"))}</div>`}</div><label>${escapeHtml(t("newLabel"))}<input id="modalNewLabel" type="text" placeholder="${escapeHtml(t("newLabelPlaceholder"))}" /></label>`;
  let picked=null;const p=showModal({title:t("chooseLabel"),body:html,buttons:[{label:t("cancel"),value:null},{label:t("ok"),value:"ok",className:"primary"}]});
  requestAnimationFrame(()=>{const list=$("modalLabelList"),selectRow=row=>{if(!row)return;picked=row.dataset.label;list?.querySelectorAll(".modal-label-option").forEach(x=>x.classList.toggle("active",x===row));const input=$("modalNewLabel");if(input)input.value="";};list?.addEventListener("click",ev=>selectRow(ev.target.closest("[data-label]")));list?.addEventListener("dblclick",ev=>{const row=ev.target.closest("[data-label]");if(!row)return;selectRow(row);ev.preventDefault();closeModal("ok");});$("modalNewLabel")?.addEventListener("input",()=>{picked=null;list?.querySelectorAll(".modal-label-option").forEach(x=>x.classList.remove("active"));});});
  const result=await p;if(result!=="ok")return null;const typed=String($("modalNewLabel")?.value||"").trim();const label=typed||picked;if(!label)return null;return label;
}
async function resolveNewShapeLabel(){if(state.activeLabel&&state.data?.hellolabel?.labels?.[state.activeLabel])return state.activeLabel;return chooseLabelModal();}
async function addLabel(){const name=await promptText(t("addLabel"),t("enterNewLabel"),"");if(!name)return;if(state.data.hellolabel.labels[name]){state.activeLabel=name;renderLabelList();return;}pushHistory();state.data.hellolabel.labels[name]={color:stableColor(name)};state.activeLabel=name;markDirty(t("labelAdded",{name}));renderLabelList();}
async function renameLabel(oldName){
  const count=labelUsage().get(oldName)||0,newName=await promptText(t("renameLabel"),t("renameSyncHint",{count}),oldName);if(!newName||newName===oldName)return;const exists=!!state.data.hellolabel.labels[newName];const msg=exists?t("renameExistingMsg",{newName:escapeHtml(newName),oldName:escapeHtml(oldName),count}):t("renameMsg",{oldName:escapeHtml(oldName),newName:escapeHtml(newName),count});if(!await confirmModal(t("confirmRename"),msg,exists?t("mergeRename"):t("renameAction")))return;
  pushHistory();const oldColor=state.data.hellolabel.labels[oldName]?.color||stableColor(oldName);if(!exists)state.data.hellolabel.labels[newName]={color:oldColor};delete state.data.hellolabel.labels[oldName];for(const s of state.data.shapes)if(s.label===oldName)s.label=newName;if(state.activeLabel===oldName)state.activeLabel=newName;markDirty(t("renameSynced"));renderAll();
}
async function deleteLabel(name){
  const usage=labelUsage(),count=usage.get(name)||0;if(count===0){if(!await confirmModal(t("deleteLabel"),t("deleteLabelConfirm",{name:escapeHtml(name)}),t("deleteAction"),true))return;pushHistory();delete state.data.hellolabel.labels[name];if(state.activeLabel===name)state.activeLabel=null;markDirty(t("labelDeleted",{name}));renderLabelList();return;}
  const alternatives=Object.keys(state.data.hellolabel.labels).filter(x=>x!==name);const body=`<div class="danger-note">${t("labelInUse",{name:escapeHtml(name),count})}</div><label>${escapeHtml(t("replacementLabel"))}<select id="replacementLabel"><option value="">${escapeHtml(t("choosePlaceholder"))}</option>${alternatives.map(x=>`<option value="${escapeHtml(x)}">${escapeHtml(x)}</option>`).join("")}</select></label><label style="display:block;margin-top:10px">${escapeHtml(t("newReplacement"))}<input id="replacementNew" type="text" placeholder="${escapeHtml(t("newLabelName"))}" /></label><label style="display:flex;gap:7px;align-items:center;margin-top:12px;color:var(--danger)"><input id="deleteAssociated" type="checkbox" /> ${escapeHtml(t("deleteAssociated",{count}))}</label>`;
  const result=await showModal({title:t("deleteLabel"),body,buttons:[{label:t("cancel"),value:null},{label:t("execute"),value:"ok",className:"primary"}]});if(result!=="ok")return;const remove=!!$("deleteAssociated")?.checked;let replacement=String($("replacementNew")?.value||"").trim()||String($("replacementLabel")?.value||"");if(!remove&&!replacement){alert(t("chooseReplacement"));return;}pushHistory();
  if(remove){const oldIds=[...shapeIds()];for(let i=state.data.shapes.length-1;i>=0;i--)if(state.data.shapes[i].label===name){const id=oldIds[i];state.data.shapes.splice(i,1);state.runtimeIds.splice(i,1);delete state.runtimeMeta[id];}}
  else{if(!state.data.hellolabel.labels[replacement])state.data.hellolabel.labels[replacement]={color:stableColor(replacement)};for(const s of state.data.shapes)if(s.label===name)s.label=replacement;}
  delete state.data.hellolabel.labels[name];if(state.activeLabel===name)state.activeLabel=remove?null:replacement;clearSelection();markDirty(remove?t("labelAndInstancesDeleted",{name,count}):t("instancesReplaced",{count,replacement}));renderAll();
}

function rebuildInstanceList(){state.instanceIds=[...shapeIds()];els.instanceCount.textContent=String(state.instanceIds.length);els.instanceListInner.style.height=`${state.instanceIds.length*INSTANCE_ROW_H}px`;scheduleInstanceListRender();}
function scheduleInstanceListRender(){if(state.instanceListRaf)return;state.instanceListRaf=requestAnimationFrame(()=>{state.instanceListRaf=0;renderInstanceListWindow();});}
function renderInstanceListWindow(){
  const count=state.instanceIds.length,viewH=els.instanceList.clientHeight||300,scroll=els.instanceList.scrollTop||0,start=Math.max(0,Math.floor(scroll/INSTANCE_ROW_H)-INSTANCE_OVERSCAN),end=Math.min(count,Math.ceil((scroll+viewH)/INSTANCE_ROW_H)+INSTANCE_OVERSCAN),frag=document.createDocumentFragment();
  for(let i=start;i<end;i++){const id=state.instanceIds[i],shape=shapeAtId(id);if(!shape)continue;const row=document.createElement("div");row.className="instance-row"+(state.selectedIds.has(id)?" active":"");row.style.top=`${i*INSTANCE_ROW_H}px`;row.dataset.shapeId=id;row.innerHTML=`<span class="instance-no">#${i+1}</span><span class="instance-label" title="${escapeHtml(shape.label)}">${escapeHtml(shape.label)}</span><span class="shape-chip">${escapeHtml(shapeTypeText(shape.shape_type))}</span>`;frag.appendChild(row);}els.instanceListInner.replaceChildren(frag);
}
function scrollInstanceToId(id){const idx=state.instanceIds.indexOf(id);if(idx<0)return;const top=idx*INSTANCE_ROW_H,bottom=top+INSTANCE_ROW_H,st=els.instanceList.scrollTop,vh=els.instanceList.clientHeight;if(top<st)els.instanceList.scrollTop=top;else if(bottom>st+vh)els.instanceList.scrollTop=Math.max(0,bottom-vh);scheduleInstanceListRender();}
function clearSelection(){state.selectedIds.clear();state.primaryId=null;state.activeHandle=null;updateSelectionPanel();renderSelectedOverlay();scheduleInstanceListRender();updateActionButtons();window.HelloLabelDrawingState?.idle?.();}
function selectId(id,{scroll=false,ensure=false,additive=false}={}){
  if(!id||!shapeAtId(id)){clearSelection();return;}if(additive){if(state.selectedIds.has(id)){state.selectedIds.delete(id);if(state.primaryId===id)state.primaryId=[...state.selectedIds].at(-1)||null;}else{state.selectedIds.add(id);state.primaryId=id;}}else{state.selectedIds=new Set([id]);state.primaryId=id;}state.activeHandle=null;updateSelectionPanel();renderSelectedOverlay();scheduleInstanceListRender();updateActionButtons();if(scroll)scrollInstanceToId(id);if(ensure)ensureShapeVisible(id);
  const selected=primaryShape();if(selected&&state.primaryId)window.HelloLabelDrawingState?.selected?.(state.primaryId,selected.label);else window.HelloLabelDrawingState?.idle?.();
}
function ensureShapeVisible(id){const shape=shapeAtId(id);if(!shape)return;const a=imageToViewport(...shapeAnchor(shape)),r=els.viewport.getBoundingClientRect(),margin=60;if(a[0]>=margin&&a[0]<=r.width-margin&&a[1]>=margin&&a[1]<=r.height-margin)return;state.panX=r.width/2-shapeAnchor(shape)[0]*state.scale;state.panY=r.height/2-shapeAnchor(shape)[1]*state.scale;scheduleViewportRender();}
function updateSelectionPanel(){const shape=primaryShape();els.noSelection.classList.toggle("hidden",!!shape);els.selectionInfo.classList.toggle("hidden",!shape);if(!shape)return;const idx=primaryIndex(),meta=shapeMeta(state.primaryId);els.selNumber.textContent=idx>=0?`#${idx+1}`:"--";els.selLabel.textContent=shape.label;els.selType.textContent=shapeTypeText(shape.shape_type);els.selPoints.textContent=String(shape.points?.length||0);els.selSource.textContent=(meta.source&&meta.source!=="manual")?meta.source:t("manual");}

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
function nearestEditableSegment(shape,p,pointerType=null){const t=shape.shape_type;if(t!=="polygon"&&t!=="linestrip")return null;const pts=shape.points||[];if(pts.length<2)return null;let best=null,bestD=Infinity,end=t==="polygon"?pts.length:pts.length-1;for(let i=0;i<end;i++){const j=(i+1)%pts.length,d=pointSegDistance(p,pts[i],pts[j]);if(d<bestD){bestD=d;best=i;}}return bestD*state.scale<=pointerProfile(pointerType).edgeHitPx?best:null;}
function insertVertexAtDoubleClick(ev){if(state.mode!=="pointer"||!state.primaryId)return;const shape=primaryShape(),p=clampImagePoint(screenToImage(ev.clientX,ev.clientY)),seg=nearestEditableSegment(shape,p,ev.pointerType);if(seg==null)return;pushHistory();shape.points.splice(seg+1,0,p);state.activeHandle={index:seg+1,kind:"point"};markDirty(t("vertexInserted"));renderAll();selectId(state.primaryId);ev.preventDefault();}
function deleteActiveVertex(){const shape=primaryShape(),h=state.activeHandle;if(!shape||!h)return false;if(shape.shape_type==="polygon"&&shape.points.length>3){pushHistory();shape.points.splice(h.index,1);state.activeHandle=null;markDirty(t("polygonVertexDeleted"));renderAll();selectId(state.primaryId);return true;}if(shape.shape_type==="linestrip"&&shape.points.length>2){pushHistory();shape.points.splice(h.index,1);state.activeHandle=null;markDirty(t("linestripVertexDeleted"));renderAll();selectId(state.primaryId);return true;}return false;}
function deleteSelected(){if(!state.data||!state.primaryId)return;if(deleteActiveVertex())return;const ids=[...state.selectedIds];pushHistory();for(let i=state.data.shapes.length-1;i>=0;i--){const id=shapeIds()[i];if(ids.includes(id)){state.data.shapes.splice(i,1);state.runtimeIds.splice(i,1);delete state.runtimeMeta[id];}}clearSelection();markDirty(t("instancesDeleted",{count:ids.length}));renderAll();}

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
els.openFolderBtn.addEventListener("click",requestFolder);
els.leftSidebarToggle?.addEventListener("click",()=>togglePanel("left"));els.rightSidebarToggle?.addEventListener("click",()=>togglePanel("right"));
els.appMenuBtn?.addEventListener("click",ev=>{ev.stopPropagation();toggleAppMenu();});
els.appMenu?.addEventListener("click",ev=>{const command=ev.target.closest("[data-command]")?.dataset.command;if(command){ev.stopPropagation();runMenuCommand(command);return;}const root=ev.target.closest(".menu-root");if(root){const entry=root.closest(".menu-entry");els.appMenu.querySelectorAll(".menu-entry.open").forEach(x=>{if(x!==entry)x.classList.remove("open")});entry?.classList.toggle("open");ev.stopPropagation();}});
document.addEventListener("pointerdown",ev=>{if(!els.appMenu?.classList.contains("hidden")&&!els.appMenu.contains(ev.target)&&ev.target!==els.appMenuBtn)closeAppMenu();});
window.HelloLabelEvents.init({buttons:MODE_BUTTONS,setMode});
els.deleteBtn.addEventListener("click",deleteSelected);els.undoBtn.addEventListener("click",undo);els.redoBtn.addEventListener("click",redo);els.saveBtn.addEventListener("click",()=>saveJsonToFolder(true).catch(e=>{setSaveState(t("saveFailed"),"error");setStatus(e.message,true);}));els.deleteJsonBtn?.addEventListener("click",deleteCurrentJson);
els.fitBtn.addEventListener("click",fitToWindow);els.actualBtn.addEventListener("click",actualSize);els.zoomOutBtn.addEventListener("click",()=>zoomAt(.8));els.zoomInBtn.addEventListener("click",()=>zoomAt(1.25));
els.showLabelsCheck.addEventListener("change",scheduleViewportRender);els.labelDisplayMode.addEventListener("change",scheduleViewportRender);els.themeBtn.addEventListener("click",cycleTheme);
els.aiToolbarToggle.addEventListener("change",()=>applyAiToolbarVisibility(els.aiToolbarToggle.checked));els.languageSelect.addEventListener("click",()=>applyLanguage(state.language==="zh"?"en":"zh"));
els.fileFilterInput.addEventListener("input",()=>{state.fileFilter=els.fileFilterInput.value;renderFileList();});els.clearFileFilterBtn.addEventListener("click",()=>{state.fileFilter="";els.fileFilterInput.value="";renderFileList();els.fileFilterInput.focus();});
els.addLabelBtn.addEventListener("click",()=>{if(state.data)addLabel();});
els.instanceList.addEventListener("scroll",scheduleInstanceListRender,{passive:true});els.instanceListInner.addEventListener("click",ev=>{const row=ev.target.closest("[data-shape-id]");if(!row)return;setMode("pointer");selectId(row.dataset.shapeId,{scroll:false,ensure:true});flashSelected();});
els.brightnessSlider.addEventListener("input",()=>{state.brightness=Number(els.brightnessSlider.value);applyImageDisplay();});els.contrastSlider.addEventListener("input",()=>{state.contrast=Number(els.contrastSlider.value);applyImageDisplay();});els.resetDisplayBtn.addEventListener("click",resetDisplay);
els.samAcceptBtn.addEventListener("click",acceptSam);els.samCancelBtn.addEventListener("click",()=>cancelSam());els.samOutputSelect.addEventListener("change",()=>{if(state.mode==="sam"&&(state.sam.points.length||state.sam.box))runSamPrediction();});els.samModelSelect.addEventListener("change",()=>{if(state.mode==="sam")resetSamState();});
els.yoloModelSelect.addEventListener("change",updateYoloUi);els.yoloRunBtn.addEventListener("click",runYolo);els.modelStatusBtn.addEventListener("click",showModelStatus);
els.modalBackdrop.addEventListener("pointerdown",ev=>{if(ev.target===els.modalBackdrop)closeModal(null);});

els.viewport.addEventListener("wheel",ev=>{if(!state.data)return;ev.preventDefault();zoomAt(ev.deltaY<0?1.12:.89,ev.clientX,ev.clientY);},{passive:false});
els.viewport.addEventListener("contextmenu",ev=>{if(state.mode==="sam")ev.preventDefault();});
els.viewport.addEventListener("pointerdown",ev=>{
  if(!state.data)return;if(startPan(ev))return;if(state.mode==="sam"){samPointerDown(ev);return;}if(state.mode==="pointer"){beginPointerEdit(ev);return;}handleDrawPointerDown(ev);
});
els.viewport.addEventListener("pointermove",ev=>{if(state.panning){movePan(ev);return;}if(state.mode==="sam"){samPointerMove(ev);return;}if(state.mode==="pointer"){movePointerEdit(ev);return;}handleDrawPointerMove(ev);});
els.viewport.addEventListener("pointerup",ev=>{try{if(state.panning){endPan();return;}if(state.mode==="sam"){samPointerUp(ev);return;}if(state.mode==="pointer"){endPointerEdit();return;}handleDrawPointerUp(ev);}finally{window.helloLabelPointerInput?.release?.(ev.pointerId);}});
els.viewport.addEventListener("pointercancel",ev=>{endPan();if(state.editing)cancelPointerEdit();if(state.sam.drag?.pointerId===ev.pointerId)state.sam.drag=null;window.helloLabelPointerInput?.release?.(ev.pointerId);renderSamOverlay();});
els.viewport.addEventListener("auxclick",ev=>{if(ev.button===1)ev.preventDefault();});
els.viewport.addEventListener("dblclick",ev=>{
  if(state.mode==="pointer"){insertVertexAtDoubleClick(ev);return;}const d=state.drawing;if(!d||(d.type!=="polygon"&&d.type!=="linestrip"))return;if(d.points.length>=2&&Math.sqrt(dist2(d.points.at(-1),d.points.at(-2)))*state.scale<12)d.points.pop();const min=d.type==="polygon"?3:2;if(d.points.length>=min)finishSequenceDrawing();
});

window.addEventListener("resize",()=>{resizeOverlay();scheduleViewportRender();scheduleInstanceListRender();});
window.addEventListener("keydown",ev=>{
  const modalOpen=!els.modalBackdrop.classList.contains("hidden");if(modalOpen){if(ev.key==="Escape"){ev.preventDefault();closeModal(null);}else if(ev.key==="Enter"&&!ev.shiftKey){const primary=[...els.modalActions.querySelectorAll("button")].at(-1);if(primary){ev.preventDefault();primary.click();}}return;}
  const editable=ev.target instanceof HTMLInputElement||ev.target instanceof HTMLSelectElement||ev.target instanceof HTMLTextAreaElement;if(ev.code==="Space"&&!editable){state.spaceDown=true;ev.preventDefault();}
  if(ev.key==="Escape"){if(state.mode==="sam"){cancelSam();ev.preventDefault();return;}if(state.drawing){cancelDrawing();ev.preventDefault();return;}}
  if(ev.key==="Enter"&&!editable){if(state.mode==="sam"&&state.sam.preview){acceptSam();ev.preventDefault();return;}if(state.drawing){const d=state.drawing;if(d.type==="oriented_rectangle"&&d.points.length===2&&d.cursor){d.points=orientedRectFromEdge(d.points[0],d.points[1],d.cursor);}finishSequenceDrawing();ev.preventDefault();return;}}
  if(state.mode==="sam"&&ev.key==="Backspace"&&!editable){ev.preventDefault();samUndoPrompt();return;}
  if((ev.key==="Delete"||ev.key==="Backspace")&&state.mode==="pointer"&&state.primaryId&&!editable){ev.preventDefault();deleteSelected();return;}
  if((ev.ctrlKey||ev.metaKey)&&!editable&&ev.key.toLowerCase()==="s"){ev.preventDefault();saveJsonToFolder(true).catch(e=>{setSaveState(t("saveFailed"),"error");setStatus(e.message,true);});return;}
  if((ev.ctrlKey||ev.metaKey)&&!editable&&ev.key.toLowerCase()==="o"){ev.preventDefault();requestFolder();return;}
  if((ev.ctrlKey||ev.metaKey)&&!editable&&ev.key.toLowerCase()==="z"){ev.preventDefault();if(ev.shiftKey)redo();else undo();return;}if((ev.ctrlKey||ev.metaKey)&&!editable&&ev.key.toLowerCase()==="y"){ev.preventDefault();redo();return;}
  if(editable||ev.ctrlKey||ev.metaKey||ev.altKey)return;const k=ev.key.toLowerCase(),map={v:"pointer",b:"pen",p:"polygon",r:"rectangle",o:"oriented_rectangle",c:"circle",d:"point",l:"line",k:"linestrip"};if(map[k]){setMode(map[k]);ev.preventDefault();}
});
window.addEventListener("keyup",ev=>{if(ev.code==="Space")state.spaceDown=false;});
window.addEventListener("beforeunload",ev=>{if(state.dirty){ev.preventDefault();ev.returnValue="";}});
matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{if(currentTheme()==="system")applyTheme("system",false);});

state.leftPanelVisible=currentPanelVisible("left");state.rightPanelVisible=currentPanelVisible("right");updatePanelToggleUi();applyAiToolbarVisibility(currentAiToolbarVisible(),false);applyLanguage(currentLanguage(),false);initRenderer();applyImageDisplay();updateYoloUi();updateActionButtons();
if(!window.showDirectoryPicker)setStatus(t("fileAccessNeeded"),true);
