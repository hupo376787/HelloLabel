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

function setStatus(text,error=false){els.statusText.textContent=text;els.statusText.style.color=error?"var(--danger)":"";}
function setBusy(on,text=t("processing")){els.busy.classList.toggle("hidden",!on);els.busyText.textContent=text;}
function setSaveState(text,kind=""){els.saveState.textContent=text;els.saveState.className=`save-state ${kind}`.trim();}
function responseError(res){return res.json().then(j=>j.detail||JSON.stringify(j)).catch(()=>`${res.status} ${res.statusText}`);}

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

function updateActionButtons(){
  const has=!!state.data, selected=!!primaryShape();
  [els.fitBtn,els.actualBtn,els.zoomOutBtn,els.zoomInBtn,els.saveBtn].forEach(b=>b.disabled=!has);
  if(els.deleteJsonBtn)els.deleteJsonBtn.disabled=!(has&&state.jsonHandle);
  els.deleteBtn.disabled=!(has&&selected&&state.mode==="pointer");els.undoBtn.disabled=state.history.length===0;els.redoBtn.disabled=state.future.length===0;
  els.samModeBtn.disabled=!has;els.yoloRunBtn.disabled=!has;
}
function enableImageUi(on){updateActionButtons();els.emptyState.classList.toggle("hidden",on);els.viewport.classList.toggle("hidden",!on);}

async function requestFolder(){
  try{await flushPendingSave();}catch(err){setStatus(t("folderSwitchSaveFailed",{message:err.message}),true);alert(t("folderSwitchCancelled",{message:err.message}));return;}
  if(!window.showDirectoryPicker){alert(t("browserUnsupported"));return;}
  try{
    const handle=await window.showDirectoryPicker({mode:"readwrite"});
    const perm=await handle.requestPermission({mode:"readwrite"});if(perm!=="granted")throw new Error(t("folderPermissionDenied"));
    resetCurrentState();state.dirHandle=handle;state.fileFilter="";els.fileFilterInput.value="";els.folderName.textContent=handle.name;await refreshFolderEntries();
  }catch(err){if(err?.name!=="AbortError")setStatus(String(err),true);}
}
async function refreshFolderEntries(){
  const entries=[],jsonNames=new Set();
  for await(const [name,handle] of state.dirHandle.entries()){if(handle.kind!=="file")continue;if(name.toLowerCase().endsWith(".json"))jsonNames.add(name.toLowerCase());if(isImage(name))entries.push({name,handle});}
  state.entries=entries.sort((a,b)=>a.name.localeCompare(b.name,undefined,{numeric:true})).map(entry=>({...entry,hasJson:jsonNames.has(`${stemOf(entry.name)}.json`.toLowerCase())}));
  renderFileList();
  setStatus(t("folderOpened",{count:state.entries.length}));
}
function renderFileList(){
  if(!els.fileList)return;if(!state.dirHandle&&!state.entries.length){els.fileList.replaceChildren();els.imageCount.textContent="0";els.clearFileFilterBtn.classList.add("hidden");return;}const q=String(state.fileFilter||"").trim().toLocaleLowerCase(),filtered=q?state.entries.filter(e=>e.name.toLocaleLowerCase().includes(q)):state.entries;
  els.fileList.replaceChildren();els.imageCount.textContent=q?`${filtered.length}/${state.entries.length}`:String(state.entries.length);els.clearFileFilterBtn.classList.toggle("hidden",!q);
  if(!filtered.length){const empty=document.createElement("div");empty.className="file-list-empty";empty.textContent=t("noMatchingImages");els.fileList.appendChild(empty);return;}
  const frag=document.createDocumentFragment();
  for(const entry of filtered){
    const row=document.createElement("div");row.className="file-item"+(entry.name===state.imageName?" active":"");row.dataset.name=entry.name;
    row.innerHTML=`<span class="file-type-icon"><svg viewBox="0 0 24 24"><rect x="3.25" y="4.25" width="17.5" height="15.5" rx="1.8"/><circle cx="8.2" cy="9" r="1.6"/><path d="M5.6 17.2l4.2-4.3 3.1 3.1 2.4-2.5 3.1 3.7"/></svg></span><span class="name" title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</span>${entry.hasJson?'<span class="badge">JSON</span>':''}`;
    row.addEventListener("click",()=>openImageEntry(entry));frag.appendChild(row);
  }
  els.fileList.appendChild(frag);
}
async function siblingJsonHandle(imageName,create=false){try{return await state.dirHandle.getFileHandle(`${stemOf(imageName)}.json`,{create});}catch(err){if(err?.name==="NotFoundError")return null;throw err;}}
function markActiveFile(name){els.fileList.querySelectorAll(".file-item").forEach(x=>x.classList.toggle("active",x.dataset.name===name));}

function resetCurrentState(){
  if(state.transformRaf)cancelAnimationFrame(state.transformRaf);if(state.instanceListRaf)cancelAnimationFrame(state.instanceListRaf);if(state.saveTimer)clearTimeout(state.saveTimer);
  if(state.previewUrl){URL.revokeObjectURL(state.previewUrl);state.previewUrl=null;}
  state.imageHandle=null;state.imageFile=null;state.imageName="";state.jsonHandle=null;state.previewBlob=null;state.aiImageToken=null;state.width=0;state.height=0;
  state.data=null;state.selectedIds.clear();state.primaryId=null;state.activeHandle=null;state.activeLabel=null;state.history=[];state.future=[];state.drawing=null;state.editing=null;state.dirty=false;state.revision=0;state.savedRevision=0;state.saveQueued=false;state.shapeById.clear();state.indexById.clear();state.shapeGrid.clear();state.boundsById.clear();state.runtimeIds=[];state.runtimeMeta={};state.instanceIds=[];state.sam={points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0};
  els.imageView.removeAttribute("src");els.stage.style.width="0px";els.stage.style.height="0px";
  els.labelList.replaceChildren();els.instanceListInner.replaceChildren();els.instanceListInner.style.height="0px";els.controlHandles.replaceChildren();els.selectedPath.classList.add("hidden-svg");els.drawingPath.classList.add("hidden-svg");els.aiPreviewPath.classList.add("hidden-svg");els.samPrompts.replaceChildren();els.selectedLabelText.classList.add("hidden-svg");
  setSaveState(t("noFileOpen"));updateSelectionPanel();enableImageUi(false);updateActionButtons();
  state.glRenderer?.clear?.();
}
async function loadPreview(file){
  const fd=new FormData();fd.append("file",file,file.name);const res=await fetch("/api/preview",{method:"POST",body:fd});if(!res.ok)throw new Error(await responseError(res));
  const blob=await res.blob();state.previewBlob=blob;state.aiImageToken=res.headers.get("X-AI-Image-Token")||null;state.width=Number(res.headers.get("X-Image-Width"));state.height=Number(res.headers.get("X-Image-Height"));
  if(state.previewUrl)URL.revokeObjectURL(state.previewUrl);state.previewUrl=URL.createObjectURL(blob);els.imageView.src=state.previewUrl;try{await els.imageView.decode();}catch{}
  els.stage.style.width=`${state.width}px`;els.stage.style.height=`${state.height}px`;resizeOverlay();
}
async function openImageEntry(entry){
  try{await flushPendingSave();}catch(err){setSaveState(t("saveFailed"),"error");setStatus(t("imageSwitchSaveFailed",{message:err.message}),true);alert(t("imageSwitchCancelled",{message:err.message}));return;}
  setBusy(true,t("readImage"));
  try{
    resetCurrentState();state.imageHandle=entry.handle;state.imageFile=await entry.handle.getFile();state.imageName=entry.name;markActiveFile(entry.name);
    await loadPreview(state.imageFile);state.jsonHandle=await siblingJsonHandle(entry.name,false);
    if(state.jsonHandle){const jf=await state.jsonHandle.getFile();state.data=validateLabelme(JSON.parse(await jf.text()));setStatus(t("loadedJson",{name:stemOf(entry.name)}));}else{state.data=createEmptyLabelme();setStatus(t("emptyJson"));}
    ensureDataImageFields();ensureHelloLabel();state.dirty=false;state.revision=0;state.savedRevision=0;setSaveState(state.jsonHandle?t("saved"):t("notCreatedJson"),state.jsonHandle?"saved":"");
    renderAll();enableImageUi(true);requestAnimationFrame(fitToWindow);
  }catch(err){console.error(err);setStatus(err?.message||String(err),true);alert(t("openFailed",{message:err?.message||err}));}finally{setBusy(false);}
}

function pushHistory(){if(!state.data)return;state.history.push({shapes:deepClone(state.data.shapes),hellolabel:deepClone(state.data.hellolabel),runtimeIds:deepClone(state.runtimeIds),runtimeMeta:deepClone(state.runtimeMeta),activeLabel:state.activeLabel});if(state.history.length>80)state.history.shift();state.future=[];updateActionButtons();}
function restoreSnapshot(snap){state.data.shapes=deepClone(snap.shapes);state.data.hellolabel=deepClone(snap.hellolabel);state.runtimeIds=deepClone(snap.runtimeIds||[]);state.runtimeMeta=deepClone(snap.runtimeMeta||{});state.activeLabel=snap.activeLabel||null;ensureHelloLabel();clearSelection();markDirty(t("modified"));renderAll();}
function undo(){if(!state.history.length||!state.data)return;const current={shapes:deepClone(state.data.shapes),hellolabel:deepClone(state.data.hellolabel),runtimeIds:deepClone(state.runtimeIds),runtimeMeta:deepClone(state.runtimeMeta),activeLabel:state.activeLabel};state.future.push(current);restoreSnapshot(state.history.pop());updateActionButtons();}
function redo(){if(!state.future.length||!state.data)return;const current={shapes:deepClone(state.data.shapes),hellolabel:deepClone(state.data.hellolabel),runtimeIds:deepClone(state.runtimeIds),runtimeMeta:deepClone(state.runtimeMeta),activeLabel:state.activeLabel};state.history.push(current);restoreSnapshot(state.future.pop());updateActionButtons();}

function markDirty(status=t("modifiedWaiting")){state.revision++;state.dirty=true;setSaveState(t("unsaved"),"saving");setStatus(status);scheduleAutoSave();}
function scheduleAutoSave(){if(!state.data||!state.dirHandle)return;if(state.saveTimer)clearTimeout(state.saveTimer);state.saveTimer=setTimeout(()=>saveJsonToFolder(false).catch(err=>{setSaveState(t("autoSaveFailed"),"error");setStatus(err.message,true);}),300);}
async function flushPendingSave(){
  if(state.saveTimer){clearTimeout(state.saveTimer);state.saveTimer=0;}
  if(state.saveInFlight&&state.savePromise)await state.savePromise;
  if(state.dirty)await saveJsonToFolder(false);
  if(state.saveInFlight&&state.savePromise)await state.savePromise;
  if(state.dirty)await saveJsonToFolder(false);
}
async function saveJsonToFolder(showMessage=true){
  if(!state.data||!state.dirHandle)return;
  if(state.saveInFlight){
    state.saveQueued=true;
    if(state.savePromise)await state.savePromise;
    if(state.dirty)return saveJsonToFolder(showMessage);
    return;
  }
  if(state.saveTimer){clearTimeout(state.saveTimer);state.saveTimer=0;}
  ensureDataImageFields();ensureHelloLabel();
  const dataRef=state.data,imageName=state.imageName,dirHandle=state.dirHandle,knownHandle=state.jsonHandle,saveRevision=state.revision;
  const payload=JSON.stringify(state.data,null,2);
  state.saveInFlight=true;setSaveState(t("saving"),"saving");
  const task=(async()=>{
    const handle=knownHandle||await dirHandle.getFileHandle(`${stemOf(imageName)}.json`,{create:true});
    const writable=await handle.createWritable();
    try{await writable.write(payload);}finally{await writable.close();}
    if(state.data===dataRef&&state.imageName===imageName){
      state.jsonHandle=handle;state.savedRevision=Math.max(state.savedRevision,saveRevision);
      if(state.revision===saveRevision){state.dirty=false;setSaveState(t("saved"),"saved");}else{state.dirty=true;setSaveState(t("pendingSave"),"saving");}
      if(showMessage&&state.revision===saveRevision)setStatus(`${t("saved")} ${stemOf(imageName)}.json`);
      updateActionButtons();
      const entry=state.entries.find(e=>e.name===imageName);if(entry)entry.hasJson=true;const badgeRow=els.fileList.querySelector(`.file-item[data-name="${CSS.escape(imageName)}"]`);if(badgeRow&&!badgeRow.querySelector(".badge")){const b=document.createElement("span");b.className="badge";b.textContent="JSON";badgeRow.appendChild(b);}
    }
  })();
  state.savePromise=task;
  try{await task;}finally{
    if(state.savePromise===task)state.savePromise=null;state.saveInFlight=false;
    if(state.saveQueued||state.dirty&&state.revision>saveRevision){state.saveQueued=false;scheduleAutoSave();}
  }
}


async function deleteCurrentJson(){
  if(!state.data||!state.dirHandle||!state.imageName)return;
  if(!state.jsonHandle){setStatus(t("noJsonToDelete"));return;}
  const confirmed=await confirmModal(t("deleteJsonTitle"),escapeHtml(t("deleteJsonConfirm")),t("deleteJson"),true);
  if(!confirmed)return;
  try{
    if(state.saveTimer){clearTimeout(state.saveTimer);state.saveTimer=0;}
    state.saveQueued=false;
    if(state.saveInFlight&&state.savePromise)await state.savePromise;
    const jsonName=`${stemOf(state.imageName)}.json`;
    await state.dirHandle.removeEntry(jsonName);
    state.jsonHandle=null;
    state.data=createEmptyLabelme();
    state.runtimeIds=[];state.runtimeMeta={};state.history=[];state.future=[];state.activeLabel=null;state.drawing=null;state.editing=null;
    state.selectedIds.clear();state.primaryId=null;state.activeHandle=null;
    state.dirty=false;state.revision=0;state.savedRevision=0;
    state.sam={points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0};
    ensureDataImageFields();ensureHelloLabel();
    const entry=state.entries.find(e=>e.name===state.imageName);if(entry)entry.hasJson=false;
    renderFileList();renderAll();
    setSaveState(t("notCreatedJson"));setStatus(t("jsonDeleted",{name:stemOf(state.imageName)}));updateActionButtons();
  }catch(err){
    const message=err?.message||String(err);setStatus(t("jsonDeleteFailed",{message}),true);alert(t("jsonDeleteFailed",{message}));
  }
}


// ---------- Geometry + WebGL2 renderer ----------
function resizeOverlay(){
  const rect=els.viewport.getBoundingClientRect(),cssW=Math.max(1,Math.round(rect.width||1)),cssH=Math.max(1,Math.round(rect.height||1)),dpr=Math.min(CANVAS_MAX_DPR,window.devicePixelRatio||1);
  const bw=Math.max(1,Math.round(cssW*dpr)),bh=Math.max(1,Math.round(cssH*dpr));if(els.shapeCanvas.width!==bw)els.shapeCanvas.width=bw;if(els.shapeCanvas.height!==bh)els.shapeCanvas.height=bh;els.shapeCanvas.style.width=`${cssW}px`;els.shapeCanvas.style.height=`${cssH}px`;els.interactionSvg.setAttribute("viewBox",`0 0 ${cssW} ${cssH}`);state.glRenderer?.resize?.(cssW,cssH,dpr);return {cssW,cssH,dpr};
}
function compileShader(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){const log=gl.getShaderInfoLog(s);gl.deleteShader(s);throw new Error(log);}return s;}
function makeProgram(gl,vs,fs){const v=compileShader(gl,gl.VERTEX_SHADER,vs),f=compileShader(gl,gl.FRAGMENT_SHADER,fs),p=gl.createProgram();gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS)){const log=gl.getProgramInfoLog(p);gl.deleteProgram(p);throw new Error(log);}return p;}
function createWebGLRenderer(canvas){
  const gl=canvas.getContext("webgl2",{alpha:true,antialias:true,premultipliedAlpha:true,desynchronized:true,powerPreference:"high-performance"});if(!gl)return {available:false};
  const lineVs=`#version 300 es
  precision highp float; layout(location=0) in vec2 aCorner; layout(location=1) in vec4 aSeg; layout(location=2) in vec4 aColor;
  uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uHalfWidth; out float vAlong; out float vSide; out float vLen; out vec4 vColor;
  void main(){vec2 s1=uPan+aSeg.xy*uScale, s2=uPan+aSeg.zw*uScale;vec2 d=s2-s1;float len=max(length(d),.001);vec2 dir=d/len, perp=vec2(-dir.y,dir.x);float along=mix(-uHalfWidth,len+uHalfWidth,aCorner.x);float side=aCorner.y*uHalfWidth;vec2 p=s1+dir*along+perp*side;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vAlong=along;vSide=side;vLen=len;vColor=aColor;}`;
  const lineFs=`#version 300 es
  precision highp float; uniform float uHalfWidth; in float vAlong; in float vSide; in float vLen; in vec4 vColor; out vec4 outColor;
  void main(){float e=0.;if(vAlong<0.)e=-vAlong;else if(vAlong>vLen)e=vAlong-vLen;float d=length(vec2(e,vSide));float aa=max(fwidth(d),.65);float a=1.-smoothstep(uHalfWidth-aa,uHalfWidth+aa,d);if(a<=.001)discard;outColor=vec4(vColor.rgb,vColor.a*a);}`;
  const pointVs=`#version 300 es
  precision highp float; layout(location=0) in vec2 aCorner; layout(location=1) in vec2 aCenter; layout(location=2) in vec4 aColor;
  uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uRadius; out vec2 vCorner; out vec4 vColor;
  void main(){vec2 c=uPan+aCenter*uScale;vec2 p=c+aCorner*uRadius;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vCorner=aCorner;vColor=aColor;}`;
  const pointFs=`#version 300 es
  precision mediump float; in vec2 vCorner; in vec4 vColor; out vec4 outColor; void main(){float r=length(vCorner);float a=1.-smoothstep(.78,1.,r);if(a<=0.)discard;outColor=vec4(vColor.rgb,vColor.a*a);}`;
  const labelVs=`#version 300 es
  precision highp float; layout(location=0) in vec4 aQuad; layout(location=1) in vec2 aCenter; layout(location=2) in vec4 aUv; layout(location=3) in vec2 aSize;
  uniform vec2 uPan; uniform float uScale; uniform vec2 uViewport; uniform float uDpr; out vec2 vUv;
  void main(){vec2 p=uPan+aCenter*uScale+aQuad.xy*aSize*uDpr;gl_Position=vec4(p.x/uViewport.x*2.-1.,1.-p.y/uViewport.y*2.,0,1);vUv=mix(aUv.xy,aUv.zw,aQuad.zw);}`;
  const labelFs=`#version 300 es
  precision mediump float; uniform sampler2D uAtlas; in vec2 vUv; out vec4 outColor; void main(){vec4 c=texture(uAtlas,vUv);if(c.a<.01)discard;outColor=c;}`;
  const lp=makeProgram(gl,lineVs,lineFs),pp=makeProgram(gl,pointVs,pointFs),tp=makeProgram(gl,labelVs,labelFs);
  const lineQuad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,lineQuad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,-1,1,-1,0,1,1,1]),gl.STATIC_DRAW);
  const pointQuad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,pointQuad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
  const labelQuad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,labelQuad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-.5,-.5,0,0,.5,-.5,1,0,-.5,.5,0,1,.5,.5,1,1]),gl.STATIC_DRAW);
  const lineBuf=gl.createBuffer(),pointBuf=gl.createBuffer(),labelBuf=gl.createBuffer(),tex=gl.createTexture();let lineCount=0,pointCount=0,labelCount=0,dpr=1;
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.disable(gl.DEPTH_TEST);
  function setGeometry(segments,points){lineCount=Math.floor((segments?.length||0)/8);pointCount=Math.floor((points?.length||0)/6);gl.bindBuffer(gl.ARRAY_BUFFER,lineBuf);gl.bufferData(gl.ARRAY_BUFFER,segments||new Float32Array(),gl.STATIC_DRAW);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuf);gl.bufferData(gl.ARRAY_BUFFER,points||new Float32Array(),gl.STATIC_DRAW);}
  function setLabels(atlas,instances){labelCount=Math.floor((instances?.length||0)/8);gl.bindBuffer(gl.ARRAY_BUFFER,labelBuf);gl.bufferData(gl.ARRAY_BUFFER,instances||new Float32Array(),gl.STATIC_DRAW);if(!atlas)return;gl.bindTexture(gl.TEXTURE_2D,tex);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,atlas);}
  function resize(_w,_h,nextDpr){dpr=Math.max(1,nextDpr||1);gl.viewport(0,0,canvas.width,canvas.height);}
  function common(program,panX,panY,scale){gl.uniform2f(gl.getUniformLocation(program,"uPan"),panX*dpr,panY*dpr);gl.uniform1f(gl.getUniformLocation(program,"uScale"),scale*dpr);gl.uniform2f(gl.getUniformLocation(program,"uViewport"),canvas.width,canvas.height);}
  function draw({panX,panY,scale,showLabels}){
    gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    if(lineCount){gl.useProgram(lp);common(lp,panX,panY,scale);gl.uniform1f(gl.getUniformLocation(lp,"uHalfWidth"),OUTLINE_PX*dpr*.5);gl.bindBuffer(gl.ARRAY_BUFFER,lineQuad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);gl.bindBuffer(gl.ARRAY_BUFFER,lineBuf);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,4,gl.FLOAT,false,32,0);gl.vertexAttribDivisor(1,1);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,32,16);gl.vertexAttribDivisor(2,1);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,lineCount);}
    if(pointCount){gl.useProgram(pp);common(pp,panX,panY,scale);gl.uniform1f(gl.getUniformLocation(pp,"uRadius"),POINT_PX*dpr);gl.bindBuffer(gl.ARRAY_BUFFER,pointQuad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(0,0);gl.bindBuffer(gl.ARRAY_BUFFER,pointBuf);gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,24,0);gl.vertexAttribDivisor(1,1);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,24,8);gl.vertexAttribDivisor(2,1);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,pointCount);}
    if(showLabels&&labelCount){gl.useProgram(tp);common(tp,panX,panY,scale);gl.uniform1f(gl.getUniformLocation(tp,"uDpr"),dpr);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(gl.getUniformLocation(tp,"uAtlas"),0);gl.bindBuffer(gl.ARRAY_BUFFER,labelQuad);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,4,gl.FLOAT,false,16,0);gl.vertexAttribDivisor(0,0);gl.bindBuffer(gl.ARRAY_BUFFER,labelBuf);const st=32;gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,2,gl.FLOAT,false,st,0);gl.vertexAttribDivisor(1,1);gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,4,gl.FLOAT,false,st,8);gl.vertexAttribDivisor(2,1);gl.enableVertexAttribArray(3);gl.vertexAttribPointer(3,2,gl.FLOAT,false,st,24);gl.vertexAttribDivisor(3,1);gl.drawArraysInstanced(gl.TRIANGLE_STRIP,0,4,labelCount);}
  }
  function clear(){setGeometry(new Float32Array(),new Float32Array());setLabels(null,new Float32Array());draw({panX:0,panY:0,scale:1,showLabels:false});}
  return {available:true,setGeometry,setLabels,resize,draw,clear};
}
function initRenderer(){if(state.glRenderer?.available)return true;try{state.glRenderer=createWebGLRenderer(els.shapeCanvas);state.webglReady=!!state.glRenderer.available;}catch(err){console.error(err);state.glRenderer={available:false};state.webglReady=false;}if(!state.webglReady)setStatus(t("webglFallback"),true);return state.webglReady;}

function rectCorners(points){if(!points?.length)return [];const a=points[0]||[0,0],b=points[1]||a;const x1=Number(a[0]),y1=Number(a[1]),x2=Number(b[0]),y2=Number(b[1]);return [[x1,y1],[x2,y1],[x2,y2],[x1,y2]];}
function circleInfo(shape){const a=shape.points?.[0]||[0,0],b=shape.points?.[1]||a;return {cx:Number(a[0]),cy:Number(a[1]),r:Math.hypot(Number(b[0])-Number(a[0]),Number(b[1])-Number(a[1]))};}
function renderVertices(shape){
  const t=shape.shape_type,p=shape.points||[];
  if(t==="rectangle")return rectCorners(p);
  if(t==="circle"){const {cx,cy,r}=circleInfo(shape),n=64,out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2;out.push([cx+Math.cos(a)*r,cy+Math.sin(a)*r]);}return out;}
  return p.map(q=>[Number(q[0]),Number(q[1])]);
}
function isClosedType(t){return t==="polygon"||t==="rectangle"||t==="oriented_rectangle"||t==="circle";}
function shapeBounds(shape){
  if(shape.shape_type==="circle"){const {cx,cy,r}=circleInfo(shape);return [cx-r,cy-r,cx+r,cy+r];}
  const p=renderVertices(shape);if(!p.length)return [0,0,0,0];let x1=Infinity,y1=Infinity,x2=-Infinity,y2=-Infinity;for(const q of p){x1=Math.min(x1,q[0]);y1=Math.min(y1,q[1]);x2=Math.max(x2,q[0]);y2=Math.max(y2,q[1]);}return [x1,y1,x2,y2];
}
function shapeAnchor(shape){const b=shapeBounds(shape);return [(b[0]+b[2])/2,(b[1]+b[3])/2];}
function addSeg(arr,a,b,c){arr.push(a[0],a[1],b[0],b[1],c[0],c[1],c[2],c[3]);}
function buildRenderCache(excludeIds=null){
  state.shapeById.clear();state.indexById.clear();state.shapeGrid.clear();state.boundsById.clear();initRenderer();const seg=[],pts=[];const ids=shapeIds(),shapes=state.data?.shapes||[];
  for(let i=0;i<shapes.length;i++){
    const id=ids[i],shape=shapes[i];state.shapeById.set(id,shape);state.indexById.set(id,i);const bounds=shapeBounds(shape);state.boundsById.set(id,bounds);
    const expand=8;const gx0=Math.floor((bounds[0]-expand)/HIT_GRID),gy0=Math.floor((bounds[1]-expand)/HIT_GRID),gx1=Math.floor((bounds[2]+expand)/HIT_GRID),gy1=Math.floor((bounds[3]+expand)/HIT_GRID);for(let gy=gy0;gy<=gy1;gy++)for(let gx=gx0;gx<=gx1;gx++){const k=`${gx},${gy}`;let a=state.shapeGrid.get(k);if(!a){a=[];state.shapeGrid.set(k,a);}a.push(id);}
    if(excludeIds?.has(id))continue;const color=hexToRgba(labelColor(shape.label),.96),v=renderVertices(shape),closed=isClosedType(shape.shape_type);
    if(shape.shape_type==="point"&&v[0]){pts.push(v[0][0],v[0][1],...color);continue;}
    for(let j=0;j<v.length-1;j++)addSeg(seg,v[j],v[j+1],color);if(closed&&v.length>2)addSeg(seg,v[v.length-1],v[0],color);
  }
  if(state.webglReady)state.glRenderer.setGeometry(new Float32Array(seg),new Float32Array(pts));
}
function buildLabelAtlas(){
  state.labelAtlas=null;state.labelInstances=new Float32Array();if(!state.data?.shapes?.length){state.glRenderer?.setLabels?.(null,new Float32Array());return;}
  const keys=new Map(),measure=document.createElement("canvas").getContext("2d");measure.font=`800 ${LABEL_FONT_PX}px "Segoe UI", "Microsoft YaHei UI", sans-serif`;const pad=4,rowH=23;let x=0,y=0,usedW=1;
  for(const shape of state.data.shapes){const label=shape.label,color=labelColor(label),key=`${label}\u0000${color}`;if(keys.has(key))continue;const w=Math.max(18,Math.ceil(measure.measureText(label).width+pad*2+5));if(x&&x+w>LABEL_ATLAS_W){x=0;y+=rowH;}keys.set(key,{label,color,x,y,w,h:rowH});x+=w;usedW=Math.max(usedW,x);}
  const atlas=document.createElement("canvas"),dpr=Math.min(2.5,Math.max(1.5,window.devicePixelRatio||1));atlas.width=Math.ceil(usedW*dpr);atlas.height=Math.ceil(Math.max(rowH,y+rowH)*dpr);const ctx=atlas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.font=`800 ${LABEL_FONT_PX}px "Segoe UI", "Microsoft YaHei UI", sans-serif`;ctx.textAlign="center";ctx.textBaseline="middle";ctx.lineJoin="round";ctx.lineWidth=3;
  for(const e of keys.values()){const cx=e.x+e.w/2,cy=e.y+e.h/2;ctx.strokeStyle="rgba(10,12,16,.86)";ctx.fillStyle=e.color;ctx.strokeText(e.label,cx,cy);ctx.fillText(e.label,cx,cy);}
  const data=new Float32Array(state.data.shapes.length*8);let o=0;for(const shape of state.data.shapes){const e=keys.get(`${shape.label}\u0000${labelColor(shape.label)}`),a=shapeAnchor(shape);data[o++]=a[0];data[o++]=a[1];data[o++]=(e.x*dpr)/atlas.width;data[o++]=(e.y*dpr)/atlas.height;data[o++]=((e.x+e.w)*dpr)/atlas.width;data[o++]=((e.y+e.h)*dpr)/atlas.height;data[o++]=e.w;data[o++]=e.h;}
  state.labelAtlas=atlas;state.labelInstances=data;if(state.webglReady)state.glRenderer.setLabels(atlas,data);
}
function shouldWebglShowLabels(){if(!els.showLabelsCheck.checked)return false;const mode=els.labelDisplayMode.value;if(mode==="selected")return false;if(mode==="all")return true;return (state.data?.shapes?.length||0)<=180||state.scale>=.65;}
function drawFallback2D(showLabels){
  const {dpr}=resizeOverlay(),ctx=els.shapeCanvas.getContext("2d");ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,els.shapeCanvas.width,els.shapeCanvas.height);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.lineWidth=OUTLINE_PX;ctx.lineJoin="round";ctx.lineCap="round";
  for(const [id,shape] of state.shapeById){if(state.editing?.id===id)continue;ctx.strokeStyle=labelColor(shape.label);ctx.fillStyle=labelColor(shape.label);const v=renderVertices(shape);if(shape.shape_type==="point"){const p=imageToViewport(...v[0]);ctx.beginPath();ctx.arc(p[0],p[1],POINT_PX,0,Math.PI*2);ctx.fill();continue;}if(!v.length)continue;ctx.beginPath();const p0=imageToViewport(...v[0]);ctx.moveTo(...p0);for(let i=1;i<v.length;i++)ctx.lineTo(...imageToViewport(...v[i]));if(isClosedType(shape.shape_type))ctx.closePath();ctx.stroke();if(showLabels){const a=imageToViewport(...shapeAnchor(shape));ctx.font=`800 ${LABEL_FONT_PX}px Segoe UI`;ctx.lineWidth=3;ctx.strokeStyle="#111";ctx.strokeText(shape.label,a[0],a[1]);ctx.fillStyle=labelColor(shape.label);ctx.fillText(shape.label,a[0],a[1]);}}
}
function scheduleViewportRender(){if(state.transformRaf)return;state.transformRaf=requestAnimationFrame(()=>{state.transformRaf=0;applyTransformNow();});}
function applyTransformNow(){els.stage.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.scale})`;els.zoomLabel.textContent=`${Math.round(state.scale*100)}%`;resizeOverlay();const show=shouldWebglShowLabels();if(state.webglReady)state.glRenderer.draw({panX:state.panX,panY:state.panY,scale:Math.max(.0001,state.scale),showLabels:show});else drawFallback2D(show);renderSelectedOverlay();renderDrawingOverlay();renderSamOverlay();}
function imageToViewport(x,y){return [state.panX+Number(x)*state.scale,state.panY+Number(y)*state.scale];}
function screenToImage(clientX,clientY){const r=els.viewport.getBoundingClientRect();return [(clientX-r.left-state.panX)/state.scale,(clientY-r.top-state.panY)/state.scale];}
function pointerProfile(pointerType=null){return window.helloLabelPointerInput?.profileFor?.(pointerType)||{pointerType:"mouse",shapeHitPx:8,vertexHitPx:10,edgeHitPx:9,polygonStartHitPx:12,allowHover:true};}
function clampImagePoint(p){return [clamp(p[0],0,Math.max(0,state.width-1)),clamp(p[1],0,Math.max(0,state.height-1))];}
function shapeScreenPath(shape){
  if(!shape)return "";if(shape.shape_type==="circle"){const {cx,cy,r}=circleInfo(shape),c=imageToViewport(cx,cy),rr=r*state.scale;return `M ${c[0]+rr} ${c[1]} A ${rr} ${rr} 0 1 0 ${c[0]-rr} ${c[1]} A ${rr} ${rr} 0 1 0 ${c[0]+rr} ${c[1]}`;}
  if(shape.shape_type==="point"){const p=imageToViewport(...shape.points[0]),r=6;return `M ${p[0]+r} ${p[1]} A ${r} ${r} 0 1 0 ${p[0]-r} ${p[1]} A ${r} ${r} 0 1 0 ${p[0]+r} ${p[1]}`;}
  const v=renderVertices(shape);if(!v.length)return "";const p0=imageToViewport(...v[0]);let d=`M ${p0[0]} ${p0[1]}`;for(let i=1;i<v.length;i++){const p=imageToViewport(...v[i]);d+=` L ${p[0]} ${p[1]}`;}if(isClosedType(shape.shape_type))d+=" Z";return d;
}
function controlPointsForShape(shape){if(!shape)return [];if(shape.shape_type==="rectangle")return rectCorners(shape.points).map((p,i)=>({p,index:i,kind:"rect-corner"}));return (shape.points||[]).map((p,i)=>({p:[Number(p[0]),Number(p[1])],index:i,kind:"point"}));}
function renderSelectedOverlay(){
  const shape=primaryShape();els.controlHandles.replaceChildren();if(!shape){els.selectedPath.classList.add("hidden-svg");els.selectedLabelText.classList.add("hidden-svg");return;}
  els.selectedPath.setAttribute("d",shapeScreenPath(shape));els.selectedPath.style.fill=isClosedType(shape.shape_type)?"":"none";els.selectedPath.classList.remove("hidden-svg");
  if(state.mode==="pointer")for(const h of controlPointsForShape(shape)){const p=imageToViewport(...h.p),c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx",p[0]);c.setAttribute("cy",p[1]);c.setAttribute("r",5);c.classList.add("control-handle");if(state.activeHandle&&state.activeHandle.index===h.index)c.classList.add("active");c.dataset.handleIndex=String(h.index);c.dataset.handleKind=h.kind;c.dataset.shapeId=state.primaryId;els.controlHandles.appendChild(c);}
  const mode=els.labelDisplayMode.value,showSelected=els.showLabelsCheck.checked&&(mode==="selected"||mode==="smart"&&!shouldWebglShowLabels());if(showSelected){const a=imageToViewport(...shapeAnchor(shape));els.selectedLabelText.textContent=shape.label;els.selectedLabelText.setAttribute("x",a[0]+7);els.selectedLabelText.setAttribute("y",a[1]-7);els.selectedLabelText.setAttribute("fill",labelColor(shape.label));els.selectedLabelText.classList.remove("hidden-svg");}else els.selectedLabelText.classList.add("hidden-svg");
}
function flashSelected(){const el=els.selectedPath;if(!state.primaryId)return;el.classList.remove("flash-3x");void el.getBoundingClientRect();el.classList.add("flash-3x");}

function pointInPolygon(x,y,pts){let inside=false;for(let i=0,j=pts.length-1;i<pts.length;j=i++){const xi=pts[i][0],yi=pts[i][1],xj=pts[j][0],yj=pts[j][1];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/((yj-yi)||1e-12)+xi))inside=!inside;}return inside;}
function pointSegDistance(p,a,b){const vx=b[0]-a[0],vy=b[1]-a[1],wx=p[0]-a[0],wy=p[1]-a[1],l=vx*vx+vy*vy;if(l<1e-12)return Math.hypot(wx,wy);let t=(wx*vx+wy*vy)/l;t=clamp(t,0,1);return Math.hypot(p[0]-(a[0]+t*vx),p[1]-(a[1]+t*vy));}
function shapeHit(shape,x,y,tol){
  const t=shape.shape_type;if(t==="circle"){const {cx,cy,r}=circleInfo(shape);return Math.hypot(x-cx,y-cy)<=r+tol;}if(t==="point")return Math.hypot(x-shape.points[0][0],y-shape.points[0][1])<=tol*1.5;
  const v=renderVertices(shape);if(isClosedType(t)&&pointInPolygon(x,y,v))return true;const end=isClosedType(t)?v.length:v.length-1;for(let i=0;i<end;i++){const j=(i+1)%v.length;if(pointSegDistance([x,y],v[i],v[j])<=tol)return true;}return false;
}
function findShapeAt(x,y,pointerType=null){const gx=Math.floor(x/HIT_GRID),gy=Math.floor(y/HIT_GRID),ids=state.shapeGrid.get(`${gx},${gy}`)||[],profile=pointerProfile(pointerType),tol=Math.max(4,profile.shapeHitPx/state.scale);let best=null,bestArea=Infinity;for(let i=ids.length-1;i>=0;i--){const id=ids[i],shape=shapeAtId(id);if(!shape||!shapeHit(shape,x,y,tol))continue;const b=state.boundsById.get(id),area=Math.max(1,(b[2]-b[0])*(b[3]-b[1]));if(area<=bestArea){best={id,shape};bestArea=area;}}return best;}

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
function resetSamState(){state.sam.points=[];state.sam.labels=[];state.sam.box=null;state.sam.history=[];state.sam.preview=null;state.sam.drag=null;state.sam.requestSeq++;els.aiPreviewPath.classList.add("hidden-svg");els.samPrompts.replaceChildren();els.samDragBox.classList.add("hidden-svg");els.samAcceptBtn.classList.add("hidden");els.samCancelBtn.classList.add("hidden");}
function cancelSam(status=true){resetSamState();if(state.mode==="sam")setMode("pointer",{keepSam:true});if(status)setStatus(t("aiCancelled"));}
function rebuildSamPromptsFromHistory(){state.sam.points=[];state.sam.labels=[];state.sam.box=null;for(const h of state.sam.history){if(h.kind==="point"){state.sam.points.push(h.point);state.sam.labels.push(h.label);}else if(h.kind==="box")state.sam.box=h.box;}renderSamOverlay();}
function renderSamOverlay(){
  els.samPrompts.replaceChildren();for(let i=0;i<state.sam.points.length;i++){const p=imageToViewport(...state.sam.points[i]),g=document.createElementNS("http://www.w3.org/2000/svg","g"),c=document.createElementNS("http://www.w3.org/2000/svg","circle");c.setAttribute("cx",p[0]);c.setAttribute("cy",p[1]);c.setAttribute("r",6);c.classList.add(state.sam.labels[i]===1?"sam-positive":"sam-negative");g.appendChild(c);if(state.sam.labels[i]===1){const l1=document.createElementNS("http://www.w3.org/2000/svg","line"),l2=document.createElementNS("http://www.w3.org/2000/svg","line");l1.setAttribute("x1",p[0]-3);l1.setAttribute("x2",p[0]+3);l1.setAttribute("y1",p[1]);l1.setAttribute("y2",p[1]);l2.setAttribute("x1",p[0]);l2.setAttribute("x2",p[0]);l2.setAttribute("y1",p[1]-3);l2.setAttribute("y2",p[1]+3);l1.classList.add("sam-prompt-cross");l2.classList.add("sam-prompt-cross");g.append(l1,l2);}else{const l1=document.createElementNS("http://www.w3.org/2000/svg","line"),l2=document.createElementNS("http://www.w3.org/2000/svg","line");for(const l of [l1,l2])l.classList.add("sam-prompt-cross");l1.setAttribute("x1",p[0]-3);l1.setAttribute("x2",p[0]+3);l1.setAttribute("y1",p[1]-3);l1.setAttribute("y2",p[1]+3);l2.setAttribute("x1",p[0]-3);l2.setAttribute("x2",p[0]+3);l2.setAttribute("y1",p[1]+3);l2.setAttribute("y2",p[1]-3);g.append(l1,l2);}els.samPrompts.appendChild(g);}
  if(state.sam.box){const [x1,y1,x2,y2]=state.sam.box,a=imageToViewport(x1,y1),b=imageToViewport(x2,y2),r=document.createElementNS("http://www.w3.org/2000/svg","rect");r.setAttribute("x",Math.min(a[0],b[0]));r.setAttribute("y",Math.min(a[1],b[1]));r.setAttribute("width",Math.abs(b[0]-a[0]));r.setAttribute("height",Math.abs(b[1]-a[1]));r.classList.add("sam-box");els.samPrompts.appendChild(r);}
  if(state.sam.preview){els.aiPreviewPath.setAttribute("d",shapeScreenPath(state.sam.preview));els.aiPreviewPath.classList.remove("hidden-svg");els.samAcceptBtn.classList.remove("hidden");els.samCancelBtn.classList.remove("hidden");}else els.aiPreviewPath.classList.add("hidden-svg");
  if(state.sam.drag){const a=imageToViewport(...state.sam.drag.start),b=imageToViewport(...state.sam.drag.current);els.samDragBox.setAttribute("x",Math.min(a[0],b[0]));els.samDragBox.setAttribute("y",Math.min(a[1],b[1]));els.samDragBox.setAttribute("width",Math.abs(b[0]-a[0]));els.samDragBox.setAttribute("height",Math.abs(b[1]-a[1]));els.samDragBox.classList.remove("hidden-svg");}else els.samDragBox.classList.add("hidden-svg");
}
async function runSamPrediction(){
  if(!state.imageFile||(state.sam.points.length===0&&!state.sam.box)){state.sam.preview=null;renderSamOverlay();return;}const seq=++state.sam.requestSeq;setBusy(true,t("inferencing",{model:els.samModelSelect.options[els.samModelSelect.selectedIndex].text}));
  try{
    const post=async(forceFile=false)=>{const fd=new FormData();if(!forceFile&&state.aiImageToken)fd.append("image_token",state.aiImageToken);else fd.append("file",state.imageFile,state.imageName);fd.append("model",els.samModelSelect.value);fd.append("points",JSON.stringify(state.sam.points));fd.append("point_labels",JSON.stringify(state.sam.labels));fd.append("box",JSON.stringify(state.sam.box));fd.append("output_shape",els.samOutputSelect.value);return fetch("/api/ai/sam",{method:"POST",body:fd});};
    let res=await post(false);if(res.status===410&&state.aiImageToken){state.aiImageToken=null;res=await post(true);}if(!res.ok)throw new Error(await responseError(res));const json=await res.json();if(seq!==state.sam.requestSeq)return;if(json.image_token)state.aiImageToken=json.image_token;state.sam.preview={label:"",points:json.shape.points,shape_type:json.shape.shape_type,group_id:null,description:"",flags:{},mask:null,_score:json.shape.score,_model:json.shape.model};renderSamOverlay();setStatus(t("aiCandidate",{score:json.shape.score!=null?`, score ${Number(json.shape.score).toFixed(3)}`:""}));
  }catch(err){if(seq===state.sam.requestSeq){state.sam.preview=null;renderSamOverlay();setStatus(err.message,true);alert(t("aiSegFailed",{message:err.message}));}}finally{if(seq===state.sam.requestSeq)setBusy(false);}
}
function samPointerDown(ev){
  if(state.mode!=="sam")return false;if(ev.button===2){ev.preventDefault();const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));state.sam.history.push({kind:"point",point:p,label:0});rebuildSamPromptsFromHistory();runSamPrediction();return true;}if(ev.button!==0)return false;const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));state.sam.drag={start:p,current:p,startClient:[ev.clientX,ev.clientY],pointerId:ev.pointerId};(window.helloLabelPointerInput?.capture?.(ev) ?? (els.viewport.setPointerCapture?.(ev.pointerId),true));renderSamOverlay();return true;
}
function samPointerMove(ev){if(state.mode!=="sam"||!state.sam.drag)return false;state.sam.drag.current=clampImagePoint(screenToImage(ev.clientX,ev.clientY));renderSamOverlay();return true;}
function samPointerUp(ev){if(state.mode!=="sam"||!state.sam.drag)return false;const d=state.sam.drag,p=clampImagePoint(screenToImage(ev.clientX,ev.clientY)),moved=Math.hypot(ev.clientX-d.startClient[0],ev.clientY-d.startClient[1]);state.sam.drag=null;if(moved>=6){const x1=Math.min(d.start[0],p[0]),y1=Math.min(d.start[1],p[1]),x2=Math.max(d.start[0],p[0]),y2=Math.max(d.start[1],p[1]);state.sam.history.push({kind:"box",box:[x1,y1,x2,y2]});}else state.sam.history.push({kind:"point",point:p,label:1});rebuildSamPromptsFromHistory();runSamPrediction();return true;}
function samUndoPrompt(){if(!state.sam.history.length)return;state.sam.history.pop();rebuildSamPromptsFromHistory();runSamPrediction();}
async function acceptSam(){const s=state.sam.preview;if(!s)return;const meta={source:s._model||els.samModelSelect.value,score:s._score??null};const type=s.shape_type,points=deepClone(s.points);resetSamState();await commitGeometry(type,points,meta);if(state.mode==="sam")setStatus(t("aiAccepted"));}
async function runYolo(){
  if(!state.imageFile)return;const model=els.yoloModelSelect.value;if(model==="yolo-world"&&!els.yoloTextInput.value.trim()){alert(t("worldNeedText"));return;}setBusy(true,t("inferencing",{model:els.yoloModelSelect.options[els.yoloModelSelect.selectedIndex].text}));
  try{const post=async(forceFile=false)=>{const fd=new FormData();if(!forceFile&&state.aiImageToken)fd.append("image_token",state.aiImageToken);else fd.append("file",state.imageFile,state.imageName);fd.append("model",model);fd.append("text",els.yoloTextInput.value.trim());fd.append("conf",els.yoloConf.value);fd.append("iou",els.yoloIou.value);fd.append("output_shape",model==="yolo11-seg"?els.yoloOutputSelect.value:"rectangle");return fetch("/api/ai/yolo",{method:"POST",body:fd});};let res=await post(false);if(res.status===410&&state.aiImageToken){state.aiImageToken=null;res=await post(true);}if(!res.ok)throw new Error(await responseError(res));const json=await res.json(),items=json.shapes||[];if(json.image_token)state.aiImageToken=json.image_token;if(!items.length){setStatus(t("noDetections"));return;}pushHistory();for(const item of items){const label=String(item.label||"object");if(!state.data.hellolabel.labels[label])state.data.hellolabel.labels[label]={color:stableColor(label)};const id=uid();state.data.shapes.push(makeShape(label,item.shape_type,item.points));state.runtimeIds.push(id);state.runtimeMeta[id]={source:item.model||model,score:item.score??null};}markDirty(t("aiAdded",{count:items.length}));renderAll();if(items.length===1)selectId(shapeIds().at(-1),{scroll:true,ensure:true});}
  catch(err){setStatus(err.message,true);alert(t("aiAutoFailed",{message:err.message}));}finally{setBusy(false);}
}
function updateYoloUi(){const m=els.yoloModelSelect.value;els.yoloTextInput.disabled=false;els.yoloTextInput.placeholder=t(m==="yolo-world"?"yoloWorldPlaceholder":"yoloFilterPlaceholder");els.yoloTextInput.title=m==="yolo-world"?t("yoloWorldPlaceholder"):t("yoloFilterPlaceholder");els.yoloOutputSelect.disabled=m!=="yolo11-seg";if(m!=="yolo11-seg")els.yoloOutputSelect.title=t("detectOutputTitle");else els.yoloOutputSelect.title=t("segOutputTitle");}
async function showModelStatus(){
  setBusy(true,t("readModelStatus"));try{const res=await fetch("/api/models");if(!res.ok)throw new Error(await responseError(res));const data=await res.json();const rows=(data.models||[]).map(m=>`<tr><td>${escapeHtml(m.name)}</td><td class="${m.installed?"model-ok":"model-missing"}">${m.installed?t("available"):t("missing")}</td><td>${m.loaded?t("loaded"):t("notLoaded")}</td><td>${escapeHtml(m.detail||"")}</td></tr>`).join("");await showModal({title:t("aiModelStatus"),body:`<table class="model-table"><thead><tr><th>${escapeHtml(t("model"))}</th><th>${escapeHtml(t("installed"))}</th><th>${escapeHtml(t("memory"))}</th><th>${escapeHtml(t("detail"))}</th></tr></thead><tbody>${rows}</tbody></table><p class="muted">${escapeHtml(t("modelStatusNote"))}</p>`,buttons:[{label:t("close"),value:"ok",className:"primary"}]});}catch(err){alert(err.message);}finally{setBusy(false);}
}

// ---------- View transform, display, modes ----------
function applyLanguage(lang,persist=true){
  lang=lang==="en"?"en":"zh";state.language=lang;if(persist)try{localStorage.setItem("hellolabel-language",lang);}catch{}
  document.documentElement.lang=lang==="en"?"en":"zh-CN";els.languageSelect.value=lang;els.languageSelect.setAttribute("aria-label",lang==="en"?"Interface language: English; click to switch to Chinese":"界面语言：中文；点击切换 English");
  document.querySelectorAll("[data-i18n]").forEach(el=>{const key=el.dataset.i18n;if(I18N[lang]?.[key]!=null)el.textContent=t(key);});
  document.querySelectorAll("[data-i18n-title]").forEach(el=>{const key=el.dataset.i18nTitle;if(I18N[lang]?.[key]!=null){const label=t(key);el.title=label;if(!el.matches("select,input"))el.setAttribute("aria-label",label);}});
  document.querySelectorAll("[data-i18n-placeholder]").forEach(el=>{const key=el.dataset.i18nPlaceholder;if(I18N[lang]?.[key]!=null)el.placeholder=t(key);});
  if(!state.dirHandle)els.folderName.textContent=t("noFolder");
  applyTheme(currentTheme(),false);updateYoloUi();renderFileList();renderLabelList();rebuildInstanceList();updateSelectionPanel();
  if(!state.data){setSaveState(t("noFileOpen"));setStatus(t("waiting"));}else if(state.dirty)setSaveState(t("unsaved"),"saving");else setSaveState(state.jsonHandle?t("saved"):t("notCreatedJson"),state.jsonHandle?"saved":"");
}
function currentAiToolbarVisible(){try{const v=localStorage.getItem("hellolabel-ai-toolbar-visible")??localStorage.getItem("labelit-ai-toolbar-visible");return v!=="0";}catch{return true;}}
function applyAiToolbarVisibility(visible,persist=true){
  visible=!!visible;state.aiToolbarVisible=visible;if(persist)try{localStorage.setItem("hellolabel-ai-toolbar-visible",visible?"1":"0");}catch{}
  if(!visible&&state.mode==="sam")cancelSam(false);document.documentElement.classList.toggle("ai-tools-hidden",!visible);els.aiToolbarToggle.checked=visible;
  requestAnimationFrame(()=>{resizeOverlay();scheduleViewportRender();scheduleInstanceListRender();});
}
function currentPanelVisible(side){try{const v=localStorage.getItem(`hellolabel-${side}-panel-visible`)??localStorage.getItem(`labelit-${side}-panel-visible`);return v!=="0";}catch{return true;}}
function updatePanelToggleUi(){
  if(!els.appGrid)return;
  const left=!!state.leftPanelVisible,right=!!state.rightPanelVisible;
  els.appGrid.classList.toggle("left-collapsed",!left);els.appGrid.classList.toggle("right-collapsed",!right);
  if(els.leftSidebarToggle){els.leftSidebarToggle.textContent=left?"‹":"›";els.leftSidebarToggle.setAttribute("aria-expanded",String(left));}
  if(els.rightSidebarToggle){els.rightSidebarToggle.textContent=right?"›":"‹";els.rightSidebarToggle.setAttribute("aria-expanded",String(right));}
}
function applyPanelVisibility(side,visible,persist=true){
  visible=!!visible;if(side==="left")state.leftPanelVisible=visible;else state.rightPanelVisible=visible;
  if(persist)try{localStorage.setItem(`hellolabel-${side}-panel-visible`,visible?"1":"0");}catch{}
  updatePanelToggleUi();requestAnimationFrame(()=>{resizeOverlay();scheduleViewportRender();scheduleInstanceListRender();});
}
function togglePanel(side){applyPanelVisibility(side,side==="left"?!state.leftPanelVisible:!state.rightPanelVisible);}
function closeAppMenu(){els.appMenu?.classList.add("hidden");els.appMenuBtn?.setAttribute("aria-expanded","false");els.appMenu?.querySelectorAll(".menu-entry.open").forEach(x=>x.classList.remove("open"));}
function toggleAppMenu(){const open=els.appMenu?.classList.contains("hidden");if(!els.appMenu)return;if(open){els.appMenu.classList.remove("hidden");els.appMenuBtn?.setAttribute("aria-expanded","true");}else closeAppMenu();}
async function showAbout(){await showModal({title:t("menuAboutHelloLabel"),body:`<div style="white-space:pre-line">${escapeHtml(t("aboutText"))}</div><div class="muted" style="padding-left:0">Version 0.2.14</div>`,buttons:[{label:t("close"),value:"ok",className:"primary"}]});}
async function showShortcuts(){
  const zh=state.language!=="en";
  const rows=zh?[
    ["V","指针：选择标注；拖动标注可移动位置，拖动控制点可修改形状。"],
    ["B","画笔：单击开始绘制，移动鼠标沿轮廓描绘，靠近起点时自动闭合。"],
    ["P","多边形：依次单击添加顶点，按 Enter 或双击完成。"],
    ["R","矩形：单击一个角开始，移动鼠标实时预览，再单击另一角完成。"],
    ["O","有向矩形：先单击两点确定一条边，再单击确定矩形宽度。"],
    ["C","圆形：单击圆心开始，移动鼠标实时预览，再单击圆周位置完成。"],
    ["D","点：单击创建一个点标注。"],
    ["L","直线：依次单击起点和终点。"],
    ["K","折线：依次单击添加折点，按 Enter 或双击完成。"],
    ["鼠标滚轮","缩放图片视图。"],
    ["鼠标中键拖动","平移图片视图。"],
    ["Space + 拖动","按住空格键并拖动鼠标，平移图片视图。"],
    ["Enter","完成当前多边形/折线；AI 交互模式下接受当前分割结果。"],
    ["Esc","取消当前绘制或取消 AI 交互。"],
    ["Backspace","AI 交互模式下撤销最后一个提示点或提示框。"],
    ["Delete","删除选中的实例；编辑多边形/折线顶点时删除当前顶点。"],
    ["双击边线","在多边形或折线的边上插入一个新顶点。"],
    ["Ctrl + O","打开图片文件夹。"],
    ["Ctrl + S","立即保存当前 Labelme JSON。"],
    ["Ctrl + Z","撤销上一步操作。"],
    ["Ctrl + Y","重做上一步被撤销的操作。"],
    ["Ctrl + Shift + Z","重做上一步被撤销的操作。"]
  ]:[
    ["V","Pointer: select annotations; drag a shape to move it, or drag handles to edit its geometry."],
    ["B","Brush: click once to start, move along the outline, and return near the start point to close automatically."],
    ["P","Polygon: click to add vertices; press Enter or double-click to finish."],
    ["R","Rectangle: click one corner to start, move the mouse for a live preview, then click the opposite corner to finish."],
    ["O","Oriented Rectangle: click two points to define an edge, then click again to set the width."],
    ["C","Circle: click the center to start, move the mouse for a live preview, then click the circumference to finish."],
    ["D","Point: click once to create a point annotation."],
    ["L","Line: click the start point and then the end point."],
    ["K","Polyline: click to add vertices; press Enter or double-click to finish."],
    ["Mouse wheel","Zoom the image view."],
    ["Middle-button drag","Pan the image view."],
    ["Space + drag","Hold Space and drag the mouse to pan the image view."],
    ["Enter","Finish the current polygon/polyline; in AI mode, accept the current segmentation result."],
    ["Esc","Cancel the current drawing or AI interaction."],
    ["Backspace","In AI mode, remove the most recent prompt point or box."],
    ["Delete","Delete the selected instance; while editing polygon/polyline vertices, delete the active vertex."],
    ["Double-click edge","Insert a new vertex on a polygon or polyline edge."],
    ["Ctrl + O","Open an image folder."],
    ["Ctrl + S","Save the current Labelme JSON immediately."],
    ["Ctrl + Z","Undo the previous operation."],
    ["Ctrl + Y","Redo the last undone operation."],
    ["Ctrl + Shift + Z","Redo the last undone operation."]
  ];
  const body=`<div class="shortcut-list">${rows.map(([key,desc])=>`<div class="shortcut-row"><kbd>${escapeHtml(key)}</kbd><span>${escapeHtml(desc)}</span></div>`).join("")}</div>`;
  await showModal({title:t("shortcuts"),body,buttons:[{label:t("close"),value:"ok",className:"primary"}]});
}
async function installAIFromMenu(){
  if(state.aiInstallerLaunching){
    setStatus(t("installAIStarted"));
    return;
  }
  const ok=await confirmModal(t("installAIConfirmTitle"),escapeHtml(t("installAIConfirmText")),t("installAI"));
  if(!ok)return;
  state.aiInstallerLaunching=true;
  setStatus(t("installAILaunching"));
  try{
    let result=null;
    if(window.helloLabelDesktop?.installAI){
      result=await window.helloLabelDesktop.installAI();
    }else{
      const response=await fetch("/api/system/install-ai",{method:"POST",headers:{"Accept":"application/json"}});
      let data={};try{data=await response.json();}catch{}
      if(!response.ok)throw new Error(data.detail||data.message||`HTTP ${response.status}`);
      result=data;
    }
    if(result&&result.ok===false)throw new Error(result.message||t("installAIUnavailable"));
    setStatus(t("installAIStarted"));
    await showModal({title:t("installAIConfirmTitle"),body:`<div>${escapeHtml(t("installAIStarted"))}</div>`,buttons:[{label:t("ok"),value:"ok",className:"primary"}]});
  }catch(err){
    state.aiInstallerLaunching=false;
    const message=err?.message||String(err);
    setStatus(t("installAIError",{message}),true);
    await showModal({title:t("installAIConfirmTitle"),body:`<div class="danger-note">${escapeHtml(t("installAIError",{message}))}</div>`,buttons:[{label:t("close"),value:"ok",className:"primary"}]});
  }
}
async function runMenuCommand(cmd){
  closeAppMenu();
  if(cmd==="open-folder")return requestFolder();
  if(cmd==="save")return saveJsonToFolder(true).catch(e=>{setSaveState(t("saveFailed"),"error");setStatus(e.message,true);});
  if(cmd==="delete-json")return deleteCurrentJson();
  if(cmd==="close"){if(window.helloLabelDesktop?.quit)return window.helloLabelDesktop.quit();window.close();return;}
  if(cmd==="toggle-left")return togglePanel("left");if(cmd==="toggle-right")return togglePanel("right");
  if(cmd==="toggle-ai"){applyAiToolbarVisibility(!state.aiToolbarVisible);return;}
  if(cmd==="install-ai")return installAIFromMenu();
  if(cmd==="fit")return fitToWindow();if(cmd==="actual")return actualSize();
  if(cmd==="undo")return undo();if(cmd==="redo")return redo();if(cmd==="delete")return deleteSelected();
  if(cmd==="lang-zh")return applyLanguage("zh");if(cmd==="lang-en")return applyLanguage("en");if(cmd==="theme")return cycleTheme();if(cmd==="model-status")return showModelStatus();
  if(cmd==="about")return showAbout();if(cmd==="shortcuts")return showShortcuts();
}
function currentTheme(){try{return localStorage.getItem("hellolabel-theme")||localStorage.getItem("labelit-theme")||"system";}catch{return "system";}}
function themeIconSvg(mode){
  if(mode==="light")return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3.6"/><path d="M12 2.8v2M12 19.2v2M2.8 12h2M19.2 12h2M5.5 5.5l1.4 1.4M17.1 17.1l1.4 1.4M18.5 5.5l-1.4 1.4M6.9 17.1l-1.4 1.4"/></svg>';
  if(mode==="dark")return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.7 15.2A7.7 7.7 0 0 1 8.8 5.3 7.8 7.8 0 1 0 18.7 15.2Z"/></svg>';
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M12 3.5a8.5 8.5 0 0 1 0 17"/></svg>';
}
function applyTheme(mode,persist=true){if(persist)try{localStorage.setItem("hellolabel-theme",mode);}catch{}const actual=mode==="system"?(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"):mode;document.documentElement.dataset.theme=actual;els.themeBtn.innerHTML=themeIconSvg(mode);const label=mode==="system"?t("systemTheme"):mode==="light"?t("lightTheme"):t("darkTheme");els.themeBtn.title=label;els.themeBtn.setAttribute("aria-label",label);if(state.data){buildLabelAtlas();scheduleViewportRender();}}
function cycleTheme(){const m=currentTheme();applyTheme(m==="system"?"light":m==="light"?"dark":"system");}
function applyImageDisplay(){const b=Math.max(0,(100+Number(state.brightness))/100),c=Number(state.contrast)/100;els.imageView.style.filter=`brightness(${b}) contrast(${c})`;els.brightnessValue.textContent=String(state.brightness);els.contrastValue.textContent=c.toFixed(2);}
function resetDisplay(){state.brightness=0;state.contrast=100;els.brightnessSlider.value="0";els.contrastSlider.value="100";applyImageDisplay();}
function fitToWindow(){if(!state.data)return;const r=els.viewport.getBoundingClientRect(),pad=20,s=Math.min((r.width-pad*2)/Math.max(1,state.width),(r.height-pad*2)/Math.max(1,state.height));state.scale=clamp(s,.02,40);state.panX=(r.width-state.width*state.scale)/2;state.panY=(r.height-state.height*state.scale)/2;scheduleViewportRender();}
function actualSize(){if(!state.data)return;const r=els.viewport.getBoundingClientRect();state.scale=1;state.panX=(r.width-state.width)/2;state.panY=(r.height-state.height)/2;scheduleViewportRender();}
function zoomAt(factor,clientX=null,clientY=null){if(!state.data)return;const r=els.viewport.getBoundingClientRect(),cx=clientX==null?r.left+r.width/2:clientX,cy=clientY==null?r.top+r.height/2:clientY,ix=(cx-r.left-state.panX)/state.scale,iy=(cy-r.top-state.panY)/state.scale,next=clamp(state.scale*factor,.02,80);state.panX=(cx-r.left)-ix*next;state.panY=(cy-r.top)-iy*next;state.scale=next;scheduleViewportRender();}
function startPan(ev){if(!(ev.button===1||(state.spaceDown&&ev.button===0)))return false;state.panning=true;state.panStart={x:ev.clientX,y:ev.clientY,panX:state.panX,panY:state.panY,pointerId:ev.pointerId};els.viewport.classList.add("panning");(window.helloLabelPointerInput?.capture?.(ev) ?? (els.viewport.setPointerCapture?.(ev.pointerId),true));ev.preventDefault();return true;}
function movePan(ev){if(!state.panning)return false;state.panX=state.panStart.panX+(ev.clientX-state.panStart.x);state.panY=state.panStart.panY+(ev.clientY-state.panStart.y);scheduleViewportRender();return true;}
function endPan(){if(!state.panning)return false;const pointerId=state.panStart?.pointerId;state.panning=false;state.panStart=null;els.viewport.classList.remove("panning");window.helloLabelPointerInput?.release?.(pointerId);return true;}
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
