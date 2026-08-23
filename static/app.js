"use strict";

const $ = id => document.getElementById(id);
const els = {
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

const IMAGE_EXTS=[".jpg",".jpeg",".png",".bmp",".tif",".tiff",".webp"];
const SHAPE_TYPES=new Set(["polygon","rectangle","oriented_rectangle","circle","point","line","linestrip"]);
const MODE_BUTTONS={pointer:els.pointerBtn,pen:els.penBtn,polygon:els.polygonBtn,rectangle:els.rectBtn,oriented_rectangle:els.obbBtn,circle:els.circleBtn,point:els.pointBtn,line:els.lineBtn,linestrip:els.linestripBtn,sam:els.samModeBtn};
const HIT_GRID=256, INSTANCE_ROW_H=34, INSTANCE_OVERSCAN=8, CANVAS_MAX_DPR=2, LABEL_ATLAS_W=2048;
const OUTLINE_PX=2.4, POINT_PX=4.2, LABEL_FONT_PX=13;

const I18N={
  zh:{
    openFolder:"打开文件夹",pointer:"指针",pen:"画笔",polygon:"多边形",rectangle:"矩形",orientedRectangle:"有向矩形",circle:"圆形",point:"点",line:"直线",linestrip:"折线",delete:"删除",undo:"撤销",redo:"重做",saveJson:"保存 JSON",deleteJson:"删除 JSON",deleteJsonTitle:"删除标注 JSON",deleteJsonConfirm:"确定删除当前图片的同名 JSON 吗？删除后当前图片的所有标注将清空，图片文件不会删除。",jsonDeleted:"已删除 {name}.json，当前标注已清空。",jsonDeleteFailed:"删除 JSON 失败：{message}",noJsonToDelete:"当前图片没有可删除的 JSON。",fitWindow:"适应窗口",actualSizeTitle:"实际大小 (100%)",zoomOutTitle:"缩小",zoomInTitle:"放大",showLabels:"显示标签",smart:"智能",all:"全部",selectedOnly:"仅选中",aiToolbar:"AI 工具栏",aiAssisted:"AI 辅助标注",aiAutoText:"AI 自动 / 文本标注",aiInteractive:"AI 交互",accept:"接受",cancel:"取消",score:"得分",run:"运行",modelStatus:"模型状态",imageList:"图片列表",noFolder:"尚未选择文件夹",filterImages:"过滤图片...",clearFilter:"清除过滤",shortcuts:"快捷操作",helpZoom:"滚轮：缩放",helpPan:"中键 / Space+拖动：平移",helpEnter:"Enter：完成多边形/折线或接受 AI",helpEsc:"Esc：取消当前绘制 / AI",helpDelete:"Delete：删除实例或当前顶点",helpUndo:"Ctrl+Z / Ctrl+Y：撤销 / 重做",helpVertex:"多边形/折线：双击边可插入顶点",openImageFolder:"打开一个包含图片的文件夹",emptyHint:"HelloLabel 会读取同名 Labelme JSON；没有 JSON 时创建空白标注，不会自动运行任何模型。",processing:"处理中...",labels:"标签",add:"新增",instances:"实例",display:"显示",brightness:"亮度",contrast:"对比度",resetDisplay:"重置显示",currentInstance:"当前实例",selectHint:"点击图形或实例列表进行选择。",number:"编号",label:"标签",type:"类型",points:"点数",source:"来源",status:"状态",manual:"手工",noFileOpen:"未打开文件",waiting:"等待操作",languageTitle:"界面语言",themeTitle:"系统 / 亮色 / 暗色",aiToolbarToggleTitle:"显示或隐藏 AI 工具栏",pointerTitle:"指针 (V)",penTitle:"画笔 (B)",polygonTitle:"多边形 (P)",rectTitle:"矩形 (R)",obbTitle:"有向矩形 (O)",circleTitle:"圆形 (C)",pointTitle:"点 (D)",lineTitle:"直线 (L)",linestripTitle:"折线 (K)",deleteTitle:"删除 (Delete)",undoTitle:"撤销 (Ctrl+Z)",redoTitle:"重做 (Ctrl+Y / Ctrl+Shift+Z)",labelDisplayStrategy:"标签显示策略",samInfo:"左键点=正样本，右键点=负样本；左键拖动=Box Prompt；Enter 接受，Esc 取消，Backspace 撤销最后一个提示。",yoloInfo:"YOLO11 Detect 输出矩形；YOLO11 Seg 可转换为多边形、矩形、有向矩形或最小包围圆。文本框在 YOLO11 中用于可选类别过滤，留空表示全部类别；YOLO-World 中用于文本类别提示。",yoloTextPlaceholder:"例如：dog,cat,bird",yoloFilterPlaceholder:"可选类别过滤，例如：dog,cat,bird",yoloWorldPlaceholder:"输入文本类别，例如：dog,cat,bird",modelStatusTitle:"查看模型安装/加载状态",polygonEn:"多边形",rectangleEn:"矩形",orientedRectangleEn:"有向矩形",circleEn:"圆形",
    systemTheme:"◐ 系统",lightTheme:"☀ 亮色",darkTheme:"● 暗色",noMatchingImages:"没有匹配的图片",folderOpened:"已打开文件夹，共 {count} 张图片。",folderOpenedFiltered:"已显示 {shown} / {total} 张图片。",saveFailed:"保存失败",saved:"已保存",notCreatedJson:"尚未创建 JSON",unsaved:"未保存",saving:"保存中...",pendingSave:"有新修改待保存",autoSaveFailed:"自动保存失败",modified:"已修改",modifiedWaiting:"已修改，等待自动保存",readImage:"读取图片...",loadedJson:"已加载 {name}.json",emptyJson:"没有同名 JSON：已创建空白标注。",openFailed:"打开失败：{message}",folderSwitchSaveFailed:"切换文件夹前保存失败：{message}",folderSwitchCancelled:"当前标注保存失败，已取消切换文件夹：{message}",imageSwitchSaveFailed:"切换图片前保存失败：{message}",imageSwitchCancelled:"当前标注保存失败，已取消切换图片：{message}",browserUnsupported:"当前浏览器不支持 File System Access API。请使用最新版 Chrome / Edge，并通过 http://127.0.0.1:9010 打开。",folderPermissionDenied:"没有获得文件夹读写权限",invalidLabelme:"同名 JSON 不是 Labelme shapes 格式。",unsupportedShape:"第 {index} 个 shape 格式不受支持。",webglFallback:"WebGL2 不可用，已使用 Canvas 2D 兼容渲染。",currentDrawLabel:"当前绘制标签：{name}",changeLabelColor:"修改标签颜色",rename:"重命名",deleteLabel:"删除标签",labelColorChanged:"标签“{name}”颜色已修改",ok:"确定",chooseLabel:"选择标签",chooseOrCreateLabel:"请选择标签，或输入新标签：",noLabelsYet:"还没有标签",newLabel:"新标签",newLabelPlaceholder:"输入名称后确定",addLabel:"新增标签",enterNewLabel:"输入新标签名称：",renameLabel:"重命名标签",renameSyncHint:"重命名后，关联的 {count} 个标注也会同步修改。",confirmRename:"确认重命名",mergeRename:"合并并重命名",renameAction:"重命名",renameExistingMsg:"标签“{newName}”已经存在。是否将“{oldName}”及其 {count} 个实例合并到已有标签？",renameMsg:"将“{oldName}”重命名为“{newName}”，并同步修改 {count} 个实例？",renameSynced:"标签重命名已同步到关联标注",deleteLabelConfirm:"删除标签“{name}”？",deleteAction:"删除",labelInUse:"标签“{name}”正在被 {count} 个实例使用。请选择替代标签；也可以新建一个替代标签。",replacementLabel:"替代标签",choosePlaceholder:"-- 请选择 --",newReplacement:"或新建替代标签",newLabelName:"新标签名称",deleteAssociated:"同时删除这 {count} 个关联实例（危险操作）",execute:"执行",chooseReplacement:"请选择或输入替代标签。",labelAdded:"已新增标签“{name}”",labelDeleted:"已删除标签“{name}”",labelAndInstancesDeleted:"已删除标签“{name}”和 {count} 个关联实例",instancesReplaced:"已将 {count} 个实例替换为“{replacement}”",newAnnotationCancelled:"已取消新标注",annotationAdded:"已新增 {type} 标注",drawingCancelled:"已取消当前绘制",polygonMin:"多边形至少需要 3 个点",linestripMin:"折线至少需要 2 个点",penHint:"画笔：移动鼠标沿轮廓绘制，回到起点附近自动闭合。Esc 取消。",sequenceHint:"{type}：继续点击添加顶点，Enter 完成。",lineHint:"直线：点击终点完成。",rectSecond:"矩形：移动鼠标实时预览，单击另一角完成。",circleSecond:"圆形：移动鼠标实时预览，单击圆周位置完成。",obbSecond:"有向矩形：点击第二点确定第一条边。",obbWidth:"有向矩形：移动鼠标确定宽度，再点击完成。",tooSmall:"{type}太小，已取消。",instanceMoved:"实例位置已修改",controlPointMoved:"控制点已修改",vertexInserted:"已插入顶点",polygonVertexDeleted:"已删除多边形顶点",linestripVertexDeleted:"已删除折线顶点",instancesDeleted:"已删除 {count} 个实例",aiCancelled:"AI 交互已取消",inferencing:"{model} 推理中...",aiCandidate:"AI 候选已更新{score}。Enter 接受。",aiSegFailed:"AI 分割失败：{message}",aiAccepted:"AI 标注已接受，可继续添加提示创建下一个实例。",worldNeedText:"YOLO-World 需要输入文本类别，例如 dog,cat,bird",noDetections:"AI 未检测到符合阈值的实例。",aiAdded:"AI 已新增 {count} 个实例",aiAutoFailed:"AI 自动标注失败：{message}",readModelStatus:"读取模型状态...",aiModelStatus:"AI 模型状态",model:"模型",installed:"安装",memory:"内存",detail:"说明",available:"可用",missing:"缺失",loaded:"已加载",notLoaded:"未加载",close:"关闭",modelStatusNote:"模型采用延迟加载；“未加载”不代表不可用。SAM3 首次使用可能需要 Hugging Face 权限和登录。",detectOutputTitle:"Detect / YOLO-World 输出 Labelme rectangle",segOutputTitle:"分割 Mask 转换类型",fileAccessNeeded:"文件夹自动 JSON 功能需要 Chrome / Edge 的 File System Access API。",
    modePointer:"指针：点击选择并拖动实例；拖动控制点可修改标注。",modePen:"画笔：单击开始，移动鼠标绘制，靠近起点自动闭合。",modePolygon:"多边形：依次点击顶点，Enter 或双击完成。",modeRectangle:"矩形：单击一个角开始，移动鼠标实时预览，再单击另一角完成。",modeObb:"有向矩形：点击两点确定第一条边，再点击确定宽度。",modeCircle:"圆形：单击圆心开始，移动鼠标实时预览，再单击圆周位置完成。",modePoint:"点：单击创建。",modeLine:"直线：点击起点和终点。",modeLinestrip:"折线：依次点击顶点，Enter 或双击完成。",modeSam:"AI 交互：左键单击=正点，右键=负点，左键拖动=Box Prompt；Enter 接受。"
  },
  en:{
    openFolder:"Open Folder",pointer:"Pointer",pen:"Brush",polygon:"Polygon",rectangle:"Rectangle",orientedRectangle:"Oriented Rectangle",circle:"Circle",point:"Point",line:"Line",linestrip:"Polyline",delete:"Delete",undo:"Undo",redo:"Redo",saveJson:"Save JSON",deleteJson:"Delete JSON",deleteJsonTitle:"Delete annotation JSON",deleteJsonConfirm:"Delete the same-name JSON for the current image? All annotations for this image will be cleared, while the image file itself will remain untouched.",jsonDeleted:"Deleted {name}.json and cleared the current annotations.",jsonDeleteFailed:"Failed to delete JSON: {message}",noJsonToDelete:"The current image has no JSON file to delete.",fitWindow:"Fit",actualSizeTitle:"Actual size (100%)",zoomOutTitle:"Zoom out",zoomInTitle:"Zoom in",showLabels:"Show labels",smart:"Smart",all:"All",selectedOnly:"Selected",aiToolbar:"AI Toolbar",aiAssisted:"AI Assisted",aiAutoText:"AI Auto / Text Annotation",aiInteractive:"AI Interactive",accept:"Accept",cancel:"Cancel",score:"Score",run:"Run",modelStatus:"Model Status",imageList:"Image List",noFolder:"No folder selected",filterImages:"Filter images...",clearFilter:"Clear filter",shortcuts:"Shortcuts",helpZoom:"Wheel: zoom",helpPan:"Middle button / Space+drag: pan",helpEnter:"Enter: finish polygon/polyline or accept AI",helpEsc:"Esc: cancel drawing / AI",helpDelete:"Delete: remove instance or active vertex",helpUndo:"Ctrl+Z / Ctrl+Y: undo / redo",helpVertex:"Polygon/polyline: double-click edge to insert vertex",openImageFolder:"Open a folder containing images",emptyHint:"HelloLabel reads same-name Labelme JSON files. If none exists, it starts with empty annotations and never runs a model automatically.",processing:"Processing...",labels:"Labels",add:"Add",instances:"Instances",display:"Display",brightness:"Brightness",contrast:"Contrast",resetDisplay:"Reset display",currentInstance:"Current Instance",selectHint:"Click a shape or an instance in the list to select it.",number:"No.",label:"Label",type:"Type",points:"Points",source:"Source",status:"Status",manual:"Manual",noFileOpen:"No file open",waiting:"Waiting",languageTitle:"Interface language",themeTitle:"System / Light / Dark",aiToolbarToggleTitle:"Show or hide the AI toolbar",pointerTitle:"Pointer (V)",penTitle:"Brush (B)",polygonTitle:"Polygon (P)",rectTitle:"Rectangle (R)",obbTitle:"Oriented Rectangle (O)",circleTitle:"Circle (C)",pointTitle:"Point (D)",lineTitle:"Line (L)",linestripTitle:"Polyline (K)",deleteTitle:"Delete (Delete)",undoTitle:"Undo (Ctrl+Z)",redoTitle:"Redo (Ctrl+Y / Ctrl+Shift+Z)",labelDisplayStrategy:"Label display strategy",samInfo:"Left click = positive point; right click = negative point; left-drag = Box Prompt; Enter accepts; Esc cancels; Backspace removes the last prompt.",yoloInfo:"YOLO11 Detect outputs rectangles; YOLO11 Seg can convert masks to polygons, rectangles, oriented rectangles, or minimum enclosing circles. For YOLO11 the text box is an optional class filter (blank = all classes); for YOLO-World it is the text class prompt.",yoloTextPlaceholder:"e.g. dog,cat,bird",yoloFilterPlaceholder:"Optional class filter, e.g. dog,cat,bird",yoloWorldPlaceholder:"Text classes, e.g. dog,cat,bird",modelStatusTitle:"View model installation/loading status",polygonEn:"Polygon",rectangleEn:"Rectangle",orientedRectangleEn:"Oriented Rectangle",circleEn:"Circle",
    systemTheme:"◐ System",lightTheme:"☀ Light",darkTheme:"● Dark",noMatchingImages:"No matching images",folderOpened:"Folder opened: {count} images.",folderOpenedFiltered:"Showing {shown} / {total} images.",saveFailed:"Save failed",saved:"Saved",notCreatedJson:"JSON not created yet",unsaved:"Unsaved",saving:"Saving...",pendingSave:"New changes pending save",autoSaveFailed:"Auto-save failed",modified:"Modified",modifiedWaiting:"Modified; waiting for auto-save",readImage:"Loading image...",loadedJson:"Loaded {name}.json",emptyJson:"No same-name JSON; created empty annotations.",openFailed:"Open failed: {message}",folderSwitchSaveFailed:"Save failed before switching folder: {message}",folderSwitchCancelled:"Current annotations could not be saved, so folder switching was cancelled: {message}",imageSwitchSaveFailed:"Save failed before switching image: {message}",imageSwitchCancelled:"Current annotations could not be saved, so image switching was cancelled: {message}",browserUnsupported:"This browser does not support the File System Access API. Use the latest Chrome / Edge and open http://127.0.0.1:9010.",folderPermissionDenied:"Folder read/write permission was not granted",invalidLabelme:"The same-name JSON is not in Labelme shapes format.",unsupportedShape:"Shape #{index} uses an unsupported format.",webglFallback:"WebGL2 is unavailable; using Canvas 2D fallback rendering.",currentDrawLabel:"Current drawing label: {name}",changeLabelColor:"Change label color",rename:"Rename",deleteLabel:"Delete label",labelColorChanged:"Color for label “{name}” changed",ok:"OK",chooseLabel:"Choose Label",chooseOrCreateLabel:"Choose an existing label or enter a new one:",noLabelsYet:"No labels yet",newLabel:"New label",newLabelPlaceholder:"Enter a name, then confirm",addLabel:"Add Label",enterNewLabel:"Enter a new label name:",renameLabel:"Rename Label",renameSyncHint:"Renaming will also update the {count} linked annotations.",confirmRename:"Confirm Rename",mergeRename:"Merge and Rename",renameAction:"Rename",renameExistingMsg:"Label “{newName}” already exists. Merge “{oldName}” and its {count} instances into it?",renameMsg:"Rename “{oldName}” to “{newName}” and update {count} instances?",renameSynced:"Label rename synced to linked annotations",deleteLabelConfirm:"Delete label “{name}”?",deleteAction:"Delete",labelInUse:"Label “{name}” is used by {count} instances. Choose a replacement label or create a new replacement.",replacementLabel:"Replacement label",choosePlaceholder:"-- Choose --",newReplacement:"Or create a replacement label",newLabelName:"New label name",deleteAssociated:"Also delete these {count} linked instances (dangerous)",execute:"Apply",chooseReplacement:"Choose or enter a replacement label.",labelAdded:"Added label “{name}”",labelDeleted:"Deleted label “{name}”",labelAndInstancesDeleted:"Deleted label “{name}” and {count} linked instances",instancesReplaced:"Reassigned {count} instances to “{replacement}”",newAnnotationCancelled:"New annotation cancelled",annotationAdded:"Added {type} annotation",drawingCancelled:"Drawing cancelled",polygonMin:"A polygon needs at least 3 points",linestripMin:"A polyline needs at least 2 points",penHint:"Brush: move the mouse along the outline; return near the start point to close automatically. Esc cancels.",sequenceHint:"{type}: click to add vertices; Enter finishes.",lineHint:"Line: click the end point to finish.",rectSecond:"Rectangle: move the mouse for a live preview, then click the opposite corner to finish.",circleSecond:"Circle: move the mouse for a live preview, then click the circumference to finish.",obbSecond:"Oriented rectangle: click the second point to define the first edge.",obbWidth:"Oriented rectangle: move to set width, then click to finish.",tooSmall:"{type} is too small and was cancelled.",instanceMoved:"Instance position changed",controlPointMoved:"Control point changed",vertexInserted:"Vertex inserted",polygonVertexDeleted:"Polygon vertex deleted",linestripVertexDeleted:"Polyline vertex deleted",instancesDeleted:"Deleted {count} instances",aiCancelled:"AI interaction cancelled",inferencing:"Running {model}...",aiCandidate:"AI candidate updated{score}. Press Enter to accept.",aiSegFailed:"AI segmentation failed: {message}",aiAccepted:"AI annotation accepted. Add more prompts to create the next instance.",worldNeedText:"YOLO-World needs text classes, e.g. dog,cat,bird",noDetections:"AI found no instances above the threshold.",aiAdded:"AI added {count} instances",aiAutoFailed:"AI auto-annotation failed: {message}",readModelStatus:"Reading model status...",aiModelStatus:"AI Model Status",model:"Model",installed:"Installed",memory:"Memory",detail:"Details",available:"Available",missing:"Missing",loaded:"Loaded",notLoaded:"Not loaded",close:"Close",modelStatusNote:"Models are loaded lazily; “Not loaded” does not mean unavailable. SAM3 may require Hugging Face access and login on first use.",detectOutputTitle:"Detect / YOLO-World outputs Labelme rectangles",segOutputTitle:"Mask conversion shape",fileAccessNeeded:"Automatic folder JSON access requires the File System Access API in Chrome / Edge.",
    modePointer:"Pointer: click to select and drag an instance; drag control points to edit it.",modePen:"Brush: click once to start, then move the mouse; return near the start point to close automatically.",modePolygon:"Polygon: click vertices; press Enter or double-click to finish.",modeRectangle:"Rectangle: click one corner to start, move for a live preview, then click the opposite corner to finish.",modeObb:"Oriented rectangle: click two points for the first edge, then click again to set width.",modeCircle:"Circle: click the center to start, move for a live preview, then click the circumference to finish.",modePoint:"Point: click to create.",modeLine:"Line: click start and end points.",modeLinestrip:"Polyline: click vertices; press Enter or double-click to finish.",modeSam:"AI interactive: left click = positive point, right click = negative point, left-drag = Box Prompt; Enter accepts."
  }
};
Object.assign(I18N.zh,{
  mainMenu:"主菜单",menuFile:"文件",menuView:"视图",menuEdit:"编辑",menuAI:"AI",menuSettings:"设置",menuAbout:"关于",menuClose:"关闭窗口",installAI:"安装 AI",installAIConfirmTitle:"安装 AI 依赖",installAIConfirmText:"安装 AI 会先关闭当前 HelloLabel 后端并启动独立安装窗口。桌面安装版会使用程序自带 Python 创建 HelloLabel 私有 AI Runtime，不需要系统 Python；源码版仍使用项目 .venv。安装完成后请重新启动 HelloLabel。是否继续？",installAILaunching:"正在启动 AI 安装程序…",installAIStarted:"AI 安装程序正在启动。HelloLabel 将关闭；请在独立安装窗口中等待完成，然后重新启动 HelloLabel。",installAIUnavailable:"当前运行环境无法启动 HelloLabel AI 安装程序。",installAIError:"启动 AI 安装程序失败：{message}",menuLeftPanel:"左侧图片栏",menuRightPanel:"右侧标注栏",menuTheme:"切换主题",menuAboutHelloLabel:"关于 HelloLabel",collapseLeftPanel:"折叠/展开左侧图片栏",collapseRightPanel:"折叠/展开右侧标注栏",aboutText:"HelloLabel · AI 辅助图像标注工具\n兼容 Labelme JSON，支持 WebGL2 高性能标注、SAM / YOLO 辅助标注。",shortcutsText:"V 指针 · B 画笔 · P 多边形 · R 矩形 · O 有向矩形 · C 圆形 · D 点 · L 直线 · K 折线\nCtrl+O 打开文件夹 · Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Y 重做"
});
Object.assign(I18N.en,{
  mainMenu:"Main menu",menuFile:"File",menuView:"View",menuEdit:"Edit",menuAI:"AI",menuSettings:"Settings",menuAbout:"About",menuClose:"Close window",installAI:"Install AI",installAIConfirmTitle:"Install AI dependencies",installAIConfirmText:"Installing AI will stop the current HelloLabel backend and open a separate installer. Packaged desktop builds use HelloLabel’s bundled Python to create a private AI runtime, so no system Python is required; source mode continues to use the project .venv. Restart HelloLabel when installation finishes. Continue?",installAILaunching:"Launching the AI installer…",installAIStarted:"The AI installer is starting. HelloLabel will close; wait for the separate installer window to finish, then restart HelloLabel.",installAIUnavailable:"This environment could not start the HelloLabel AI installer.",installAIError:"Failed to start the AI installer: {message}",menuLeftPanel:"Left image panel",menuRightPanel:"Right annotation panel",menuTheme:"Switch theme",menuAboutHelloLabel:"About HelloLabel",collapseLeftPanel:"Collapse/expand left image panel",collapseRightPanel:"Collapse/expand right annotation panel",aboutText:"HelloLabel · AI-assisted image annotation\nLabelme-compatible JSON, WebGL2 rendering, SAM / YOLO assisted annotation.",shortcutsText:"V Pointer · B Brush · P Polygon · R Rectangle · O Oriented Rectangle · C Circle · D Point · L Line · K Polyline\nCtrl+O Open folder · Ctrl+S Save · Ctrl+Z Undo · Ctrl+Y Redo"
});
function currentLanguage(){try{return localStorage.getItem("hellolabel-language")||localStorage.getItem("labelit-language")||"zh";}catch{return "zh";}}
function t(key,vars={}){const lang=state?.language||currentLanguage();let text=(I18N[lang]&&I18N[lang][key])??I18N.zh[key]??key;for(const [k,v] of Object.entries(vars||{}))text=text.replaceAll(`{${k}}`,String(v));return text;}
function shapeTypeText(type){const key={polygon:"polygon",rectangle:"rectangle",oriented_rectangle:"orientedRectangle",circle:"circle",point:"point",line:"line",linestrip:"linestrip"}[type];return key?t(key):String(type||"");}

const state={
  dirHandle:null, entries:[], fileFilter:"", imageHandle:null, imageFile:null, imageName:"", jsonHandle:null, data:null,
  width:0,height:0,previewUrl:null,previewBlob:null,aiImageToken:null,
  selectedIds:new Set(), primaryId:null, activeHandle:null, activeLabel:null,
  mode:"pointer", dirty:false, revision:0, savedRevision:0, history:[], future:[], saveTimer:0, saveInFlight:false, saveQueued:false, savePromise:null,
  scale:1,panX:0,panY:0,panning:false,panStart:null,spaceDown:false,transformRaf:0,
  drawing:null, editing:null,
  shapeById:new Map(), indexById:new Map(), shapeGrid:new Map(), boundsById:new Map(), runtimeIds:[], runtimeMeta:{},
  glRenderer:null,webglReady:false,labelAtlas:null,labelInstances:null,
  instanceIds:[],instanceListRaf:0,
  brightness:0,contrast:100,
  sam:{points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0},
  modalResolve:null, language:currentLanguage(), aiToolbarVisible:true, leftPanelVisible:true, rightPanelVisible:true, aiInstallerLaunching:false,
};

function deepClone(v){return v==null?v:JSON.parse(JSON.stringify(v));}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function stemOf(name){const i=name.lastIndexOf(".");return i>0?name.slice(0,i):name;}
function extOf(name){const i=name.lastIndexOf(".");return i>=0?name.slice(i).toLowerCase():"";}
function isImage(name){return IMAGE_EXTS.includes(extOf(name));}
function clamp(v,a,b){return Math.max(a,Math.min(b,v));}
function dist2(a,b){const dx=a[0]-b[0],dy=a[1]-b[1];return dx*dx+dy*dy;}
function uid(){return globalThis.crypto?.randomUUID?.() || `shape-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;}
function setStatus(text,error=false){els.statusText.textContent=text;els.statusText.style.color=error?"var(--danger)":"";}
function setBusy(on,text=t("processing")){els.busy.classList.toggle("hidden",!on);els.busyText.textContent=text;}
function setSaveState(text,kind=""){els.saveState.textContent=text;els.saveState.className=`save-state ${kind}`.trim();}
function responseError(res){return res.json().then(j=>j.detail||JSON.stringify(j)).catch(()=>`${res.status} ${res.statusText}`);}

function hashString(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return h>>>0;}
function hslToHex(h,s,l){s/=100;l/=100;const k=n=>(n+h/30)%12,a=s*Math.min(l,1-l),f=n=>l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1)));return `#${[f(0),f(8),f(4)].map(x=>Math.round(255*x).toString(16).padStart(2,"0")).join("")}`;}
function stableColor(label){const h=hashString(label)%360;return hslToHex(h,72,55);}
function hexToRgba(hex,alpha=1){const m=String(hex).match(/^#([0-9a-f]{6})$/i);if(!m)return [0.2,0.8,0.4,alpha];const n=parseInt(m[1],16);return [((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255,alpha];}

function ensureHelloLabel(){
  if(!state.data)return;
  // Read legacy Labelit JSONs, but normalize all future saves to the HelloLabel extension key.
  if((!state.data.hellolabel||typeof state.data.hellolabel!=="object"||Array.isArray(state.data.hellolabel))
      && state.data.labelit&&typeof state.data.labelit==="object"&&!Array.isArray(state.data.labelit)){
    state.data.hellolabel=deepClone(state.data.labelit);
  }
  delete state.data.labelit;
  if(!state.data.hellolabel||typeof state.data.hellolabel!=="object"||Array.isArray(state.data.hellolabel))state.data.hellolabel={};
  const hl=state.data.hellolabel;
  if(!hl.labels||typeof hl.labels!=="object"||Array.isArray(hl.labels))hl.labels={};
  // Migrate early development JSONs without persisting internal instance IDs/metadata.
  if(Array.isArray(hl.shapeIds)&&state.runtimeIds.length===0)state.runtimeIds=hl.shapeIds.map(x=>String(x||""));
  if(hl.shapeMeta&&typeof hl.shapeMeta==="object"&&!Array.isArray(hl.shapeMeta)&&Object.keys(state.runtimeMeta).length===0)state.runtimeMeta=deepClone(hl.shapeMeta);
  delete hl.shapeIds;delete hl.shapeMeta;delete hl.version;
  const shapes=state.data.shapes||[];
  while(state.runtimeIds.length<shapes.length)state.runtimeIds.push(uid());
  if(state.runtimeIds.length>shapes.length)state.runtimeIds.length=shapes.length;
  const seen=new Set();
  for(let i=0;i<state.runtimeIds.length;i++){
    let id=String(state.runtimeIds[i]||"");if(!id||seen.has(id)){id=uid();state.runtimeIds[i]=id;}seen.add(id);
  }
  for(const shape of shapes){
    const label=String(shape.label||"").trim()||"unlabeled";shape.label=label;
    if(!hl.labels[label])hl.labels[label]={color:stableColor(label)};
    if(!/^#[0-9a-f]{6}$/i.test(hl.labels[label]?.color||""))hl.labels[label].color=stableColor(label);
  }
}

function shapeIds(){return state.runtimeIds;}
function shapeMeta(id){return state.runtimeMeta?.[id]||{};}
function labelColor(label){return state.data?.hellolabel?.labels?.[label]?.color||stableColor(label);}
function shapeAtId(id){const idx=state.indexById.get(id);return idx==null?null:state.data?.shapes?.[idx]||null;}
function primaryShape(){return state.primaryId?shapeAtId(state.primaryId):null;}
function primaryIndex(){return state.primaryId?state.indexById.get(state.primaryId):-1;}

function createEmptyLabelme(){
  return {version:"7.0.4",flags:{},shapes:[],imagePath:state.imageName,imageData:null,imageHeight:state.height,imageWidth:state.width,hellolabel:{labels:{}}};
}
function validateLabelme(data){
  if(!data||!Array.isArray(data.shapes))throw new Error(t("invalidLabelme"));
  for(const [i,s] of data.shapes.entries()){
    if(!s||!Array.isArray(s.points)||!SHAPE_TYPES.has(String(s.shape_type||"polygon")))throw new Error(t("unsupportedShape",{index:i+1}));
    s.shape_type=String(s.shape_type||"polygon");s.label=String(s.label||"unlabeled");
    if(s.group_id===undefined)s.group_id=null;if(s.description===undefined)s.description="";if(!s.flags)s.flags={};if(s.mask===undefined)s.mask=null;
  }
  if(data.version==null)data.version="7.0.4";if(!data.flags)data.flags={};
  ensureDataImageFields(data);return data;
}
function ensureDataImageFields(data=state.data){if(!data)return;data.imagePath=state.imageName;data.imageData=null;data.imageHeight=state.height;data.imageWidth=state.width;}

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
function findShapeAt(x,y){const gx=Math.floor(x/HIT_GRID),gy=Math.floor(y/HIT_GRID),ids=state.shapeGrid.get(`${gx},${gy}`)||[],tol=Math.max(4,8/state.scale);let best=null,bestArea=Infinity;for(let i=ids.length-1;i>=0;i--){const id=ids[i],shape=shapeAtId(id);if(!shape||!shapeHit(shape,x,y,tol))continue;const b=state.boundsById.get(id),area=Math.max(1,(b[2]-b[0])*(b[3]-b[1]));if(area<=bestArea){best={id,shape};bestArea=area;}}return best;}

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
function clearSelection(){state.selectedIds.clear();state.primaryId=null;state.activeHandle=null;updateSelectionPanel();renderSelectedOverlay();scheduleInstanceListRender();updateActionButtons();}
function selectId(id,{scroll=false,ensure=false,additive=false}={}){
  if(!id||!shapeAtId(id)){clearSelection();return;}if(additive){if(state.selectedIds.has(id)){state.selectedIds.delete(id);if(state.primaryId===id)state.primaryId=[...state.selectedIds].at(-1)||null;}else{state.selectedIds.add(id);state.primaryId=id;}}else{state.selectedIds=new Set([id]);state.primaryId=id;}state.activeHandle=null;updateSelectionPanel();renderSelectedOverlay();scheduleInstanceListRender();updateActionButtons();if(scroll)scrollInstanceToId(id);if(ensure)ensureShapeVisible(id);
}
function ensureShapeVisible(id){const shape=shapeAtId(id);if(!shape)return;const a=imageToViewport(...shapeAnchor(shape)),r=els.viewport.getBoundingClientRect(),margin=60;if(a[0]>=margin&&a[0]<=r.width-margin&&a[1]>=margin&&a[1]<=r.height-margin)return;state.panX=r.width/2-shapeAnchor(shape)[0]*state.scale;state.panY=r.height/2-shapeAnchor(shape)[1]*state.scale;scheduleViewportRender();}
function updateSelectionPanel(){const shape=primaryShape();els.noSelection.classList.toggle("hidden",!!shape);els.selectionInfo.classList.toggle("hidden",!shape);if(!shape)return;const idx=primaryIndex(),meta=shapeMeta(state.primaryId);els.selNumber.textContent=idx>=0?`#${idx+1}`:"--";els.selLabel.textContent=shape.label;els.selType.textContent=shapeTypeText(shape.shape_type);els.selPoints.textContent=String(shape.points?.length||0);els.selSource.textContent=(meta.source&&meta.source!=="manual")?meta.source:t("manual");}

// ---------- Manual drawing + pointer editing ----------
function makeShape(label,type,points){return {label,points:points.map(p=>[roundCoord(p[0]),roundCoord(p[1])]),group_id:null,description:"",shape_type:type,flags:{},mask:null};}
function roundCoord(v){return Math.round(Number(v)*1000)/1000;}
async function commitGeometry(type,points,meta={source:"manual"}){
  if(!state.data||!points?.length)return;const label=await resolveNewShapeLabel();if(!label){setStatus(t("newAnnotationCancelled"));return;}pushHistory();if(!state.data.hellolabel.labels[label])state.data.hellolabel.labels[label]={color:stableColor(label)};state.activeLabel=label;const id=uid(),shape=makeShape(label,type,points);state.data.shapes.push(shape);state.runtimeIds.push(id);state.runtimeMeta[id]={...meta};markDirty(t("annotationAdded",{type:shapeTypeText(type)}));renderAll();selectId(id,{scroll:true});
}
function rdp(points,eps){if(points.length<3)return points;let maxD=0,idx=0;const a=points[0],b=points.at(-1);for(let i=1;i<points.length-1;i++){const d=pointSegDistance(points[i],a,b);if(d>maxD){maxD=d;idx=i;}}if(maxD<=eps)return [a,b];const left=rdp(points.slice(0,idx+1),eps),right=rdp(points.slice(idx),eps);return left.slice(0,-1).concat(right);}
function simplifyPen(points){if(points.length<4)return points;const min=Math.max(.6,1.2/state.scale),out=[points[0]];for(let i=1;i<points.length;i++)if(dist2(points[i],out.at(-1))>=min*min)out.push(points[i]);const simp=rdp(out,Math.max(.45,.85/state.scale));return simp.length>=3?simp:out;}
function cancelDrawing(status=true){state.drawing=null;renderDrawingOverlay();if(status)setStatus(t("drawingCancelled"));}
function orientedRectFromEdge(a,b,c){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<1e-6)return [a,b,b,a];const nx=-dy/len,ny=dx/len,h=(c[0]-b[0])*nx+(c[1]-b[1])*ny;return [a,b,[b[0]+nx*h,b[1]+ny*h],[a[0]+nx*h,a[1]+ny*h]];}
function currentDrawingShape(){
  const d=state.drawing;if(!d)return null;
  if(d.type==="pen"||d.type==="polygon"||d.type==="linestrip"){const pts=[...(d.points||[])];if(d.cursor&&d.type!=="pen")pts.push(d.cursor);return makeShape("",d.type==="polygon"?"linestrip":"linestrip",pts);}
  if(d.type==="line"){const pts=[...(d.points||[])];if(d.cursor)pts.push(d.cursor);return makeShape("","line",pts.slice(0,2));}
  if(d.type==="rectangle"&&d.start&&d.current)return makeShape("","rectangle",[d.start,d.current]);
  if(d.type==="circle"&&d.start&&d.current)return makeShape("","circle",[d.start,d.current]);
  if(d.type==="oriented_rectangle"){
    if(d.points.length===1&&d.cursor)return makeShape("","line",[d.points[0],d.cursor]);
    if(d.points.length>=2&&d.cursor)return makeShape("","oriented_rectangle",orientedRectFromEdge(d.points[0],d.points[1],d.cursor));
  }
  return null;
}
function renderDrawingOverlay(){
  const shape=currentDrawingShape();if(!shape||!shape.points?.length){els.drawingPath.classList.add("hidden-svg");els.drawingStart.classList.add("hidden-svg");return;}els.drawingPath.setAttribute("d",shapeScreenPath(shape));els.drawingPath.style.fill=isClosedType(shape.shape_type)?"":"none";els.drawingPath.classList.remove("hidden-svg");const first=shape.points[0]?imageToViewport(...shape.points[0]):null;if(first&&(state.drawing.type==="pen"||state.drawing.type==="polygon"||state.drawing.type==="linestrip")){els.drawingStart.setAttribute("cx",first[0]);els.drawingStart.setAttribute("cy",first[1]);els.drawingStart.classList.remove("hidden-svg");}else els.drawingStart.classList.add("hidden-svg");
}
async function finishSequenceDrawing(){
  const d=state.drawing;if(!d)return;let type=d.type,points=d.points||[];if(type==="pen"){points=simplifyPen(points);type="polygon";}if(type==="polygon"&&points.length<3){setStatus(t("polygonMin"),true);return;}if(type==="linestrip"&&points.length<2){setStatus(t("linestripMin"),true);return;}if(type==="line"&&points.length<2){return;}if(type==="oriented_rectangle"&&points.length<4)return;state.drawing=null;renderDrawingOverlay();await commitGeometry(type,points);
}
function handleDrawPointerDown(ev){
  if(ev.button!==0||!state.data)return false;const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY)),m=state.mode;
  if(m==="pen"){
    if(!state.drawing){state.drawing={type:"pen",points:[p],cursor:p};setStatus(t("penHint"));}return true;
  }
  if(m==="polygon"||m==="linestrip"){
    if(!state.drawing)state.drawing={type:m,points:[p],cursor:p};else state.drawing.points.push(p);renderDrawingOverlay();setStatus(t("sequenceHint",{type:shapeTypeText(m)}));return true;
  }
  if(m==="line"){
    if(!state.drawing){state.drawing={type:"line",points:[p],cursor:p};setStatus(t("lineHint"));}else{state.drawing.points.push(p);finishSequenceDrawing();}renderDrawingOverlay();return true;
  }
  if(m==="rectangle"||m==="circle"){
    if(!state.drawing){
      state.drawing={type:m,start:p,current:p};
      setStatus(t(m==="rectangle"?"rectSecond":"circleSecond"));
      renderDrawingOverlay();
      return true;
    }
    if(state.drawing.type===m&&state.drawing.start){
      const d=state.drawing;d.current=p;
      const screenDist=Math.sqrt(dist2(d.start,p))*state.scale;
      const type=d.type,points=[d.start,d.current];
      state.drawing=null;renderDrawingOverlay();
      if(screenDist>=3)commitGeometry(type,points);else setStatus(t("tooSmall",{type:shapeTypeText(type)}));
      return true;
    }
  }
  if(m==="point"){commitGeometry("point",[p]);return true;}
  if(m==="oriented_rectangle"){
    if(!state.drawing){state.drawing={type:m,points:[p],cursor:p};setStatus(t("obbSecond"));}
    else if(state.drawing.points.length===1){state.drawing.points.push(p);state.drawing.cursor=p;setStatus(t("obbWidth"));}
    else{const pts=orientedRectFromEdge(state.drawing.points[0],state.drawing.points[1],p);state.drawing={type:m,points:pts,cursor:null};finishSequenceDrawing();}renderDrawingOverlay();return true;
  }
  return false;
}
function handleDrawPointerMove(ev){
  const d=state.drawing;if(!d)return false;const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));d.cursor=p;
  if(d.type==="pen"){
    const last=d.points.at(-1),minScreen=2.3;if(Math.sqrt(dist2(last,p))*state.scale>=minScreen)d.points.push(p);if(d.points.length>=12){const first=d.points[0],screenDist=Math.sqrt(dist2(first,p))*state.scale;if(screenDist<=11){finishSequenceDrawing();return true;}}
  }else if(d.type==="rectangle"||d.type==="circle")d.current=p;renderDrawingOverlay();return true;
}
function handleDrawPointerUp(_ev){return false;}

function translatePoints(points,dx,dy){return points.map(p=>clampImagePoint([Number(p[0])+dx,Number(p[1])+dy]));}
function dragOrientedCorner(points,index,newP){
  const p=points.map(q=>[Number(q[0]),Number(q[1])]);if(p.length!==4){p[index]=newP;return p;}const opp=(index+2)%4,prev=(opp+3)%4,next=(opp+1)%4,o=p[opp];let ux=p[prev][0]-o[0],uy=p[prev][1]-o[1],vx=p[next][0]-o[0],vy=p[next][1]-o[1],ul=Math.hypot(ux,uy)||1,vl=Math.hypot(vx,vy)||1;ux/=ul;uy/=ul;vx/=vl;vy/=vl;const dx=newP[0]-o[0],dy=newP[1]-o[1],a=dx*ux+dy*uy,b=dx*vx+dy*vy;const q=p.slice();q[opp]=o;q[prev]=clampImagePoint([o[0]+ux*a,o[1]+uy*a]);q[next]=clampImagePoint([o[0]+vx*b,o[1]+vy*b]);q[index]=clampImagePoint([o[0]+ux*a+vx*b,o[1]+uy*a+vy*b]);return q;
}
function applyHandleDrag(shape,index,kind,newP,original){
  const t=shape.shape_type;if(t==="rectangle"){const corners=rectCorners(original.points),opp=corners[(index+2)%4];shape.points=[clampImagePoint(newP),clampImagePoint(opp)];return;}
  if(t==="oriented_rectangle"){shape.points=dragOrientedCorner(original.points,index,newP);return;}
  if(t==="circle"&&index===0){const old=original.points[0],dx=newP[0]-old[0],dy=newP[1]-old[1];shape.points=[clampImagePoint(newP),clampImagePoint([original.points[1][0]+dx,original.points[1][1]+dy])];return;}
  const pts=deepClone(original.points);pts[index]=clampImagePoint(newP);shape.points=pts;
}
function beginPointerEdit(ev){
  if(state.mode!=="pointer"||ev.button!==0)return false;const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));const target=ev.target.closest?.(".control-handle");
  if(target){const id=target.dataset.shapeId,index=Number(target.dataset.handleIndex);selectId(id);state.activeHandle={index,kind:target.dataset.handleKind};state.editing={kind:"handle",id,index,handleKind:target.dataset.handleKind,start:p,startClient:[ev.clientX,ev.clientY],original:deepClone(shapeAtId(id)),historyPushed:false,moved:false};els.viewport.setPointerCapture?.(ev.pointerId);renderSelectedOverlay();return true;}
  const hit=findShapeAt(p[0],p[1]);if(!hit){clearSelection();return false;}selectId(hit.id,{additive:ev.ctrlKey||ev.metaKey});if(ev.ctrlKey||ev.metaKey)return true;state.editing={kind:"move",id:hit.id,start:p,startClient:[ev.clientX,ev.clientY],original:deepClone(hit.shape),historyPushed:false,moved:false};els.viewport.setPointerCapture?.(ev.pointerId);return true;
}
function movePointerEdit(ev){
  const ed=state.editing;if(!ed)return false;const movedPx=Math.hypot(ev.clientX-ed.startClient[0],ev.clientY-ed.startClient[1]);if(!ed.moved&&movedPx<2)return true;if(!ed.historyPushed){pushHistory();ed.historyPushed=true;ed.moved=true;buildRenderCache(new Set([ed.id]));buildLabelAtlas();}
  const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY)),shape=shapeAtId(ed.id);if(!shape)return true;if(ed.kind==="move"){const dx=p[0]-ed.start[0],dy=p[1]-ed.start[1];shape.points=translatePoints(ed.original.points,dx,dy);}else applyHandleDrag(shape,ed.index,ed.handleKind,p,ed.original);renderSelectedOverlay();scheduleViewportRender();return true;
}
function endPointerEdit(){const ed=state.editing;if(!ed)return false;state.editing=null;if(ed.moved){markDirty(ed.kind==="move"?t("instanceMoved"):t("controlPointMoved"));renderAll();selectId(ed.id);}return true;}
function nearestEditableSegment(shape,p){const t=shape.shape_type;if(t!=="polygon"&&t!=="linestrip")return null;const pts=shape.points||[];if(pts.length<2)return null;let best=null,bestD=Infinity,end=t==="polygon"?pts.length:pts.length-1;for(let i=0;i<end;i++){const j=(i+1)%pts.length,d=pointSegDistance(p,pts[i],pts[j]);if(d<bestD){bestD=d;best=i;}}return bestD*state.scale<=9?best:null;}
function insertVertexAtDoubleClick(ev){if(state.mode!=="pointer"||!state.primaryId)return;const shape=primaryShape(),p=clampImagePoint(screenToImage(ev.clientX,ev.clientY)),seg=nearestEditableSegment(shape,p);if(seg==null)return;pushHistory();shape.points.splice(seg+1,0,p);state.activeHandle={index:seg+1,kind:"point"};markDirty(t("vertexInserted"));renderAll();selectId(state.primaryId);ev.preventDefault();}
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
  if(state.mode!=="sam")return false;if(ev.button===2){ev.preventDefault();const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));state.sam.history.push({kind:"point",point:p,label:0});rebuildSamPromptsFromHistory();runSamPrediction();return true;}if(ev.button!==0)return false;const p=clampImagePoint(screenToImage(ev.clientX,ev.clientY));state.sam.drag={start:p,current:p,startClient:[ev.clientX,ev.clientY],pointerId:ev.pointerId};els.viewport.setPointerCapture?.(ev.pointerId);renderSamOverlay();return true;
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
function startPan(ev){if(!(ev.button===1||(state.spaceDown&&ev.button===0)))return false;state.panning=true;state.panStart={x:ev.clientX,y:ev.clientY,panX:state.panX,panY:state.panY,pointerId:ev.pointerId};els.viewport.classList.add("panning");els.viewport.setPointerCapture?.(ev.pointerId);ev.preventDefault();return true;}
function movePan(ev){if(!state.panning)return false;state.panX=state.panStart.panX+(ev.clientX-state.panStart.x);state.panY=state.panStart.panY+(ev.clientY-state.panStart.y);scheduleViewportRender();return true;}
function endPan(){if(!state.panning)return false;state.panning=false;state.panStart=null;els.viewport.classList.remove("panning");return true;}
function setMode(mode,{keepSam=false}={}){
  if(!MODE_BUTTONS[mode])return;if(state.drawing)cancelDrawing(false);if(state.mode==="sam"&&mode!=="sam"&&!keepSam)resetSamState();state.mode=mode;for(const [m,b] of Object.entries(MODE_BUTTONS))b?.classList.toggle("active",m===mode);els.viewport.classList.toggle("draw-mode",!['pointer','sam'].includes(mode));els.viewport.classList.toggle("sam-mode",mode==="sam");state.activeHandle=null;renderSelectedOverlay();updateActionButtons();
  const key={pointer:"modePointer",pen:"modePen",polygon:"modePolygon",rectangle:"modeRectangle",oriented_rectangle:"modeObb",circle:"modeCircle",point:"modePoint",line:"modeLine",linestrip:"modeLinestrip",sam:"modeSam"}[mode];setStatus(t(key));
}

// ---------- Events ----------
els.openFolderBtn.addEventListener("click",requestFolder);
els.leftSidebarToggle?.addEventListener("click",()=>togglePanel("left"));els.rightSidebarToggle?.addEventListener("click",()=>togglePanel("right"));
els.appMenuBtn?.addEventListener("click",ev=>{ev.stopPropagation();toggleAppMenu();});
els.appMenu?.addEventListener("click",ev=>{const command=ev.target.closest("[data-command]")?.dataset.command;if(command){ev.stopPropagation();runMenuCommand(command);return;}const root=ev.target.closest(".menu-root");if(root){const entry=root.closest(".menu-entry");els.appMenu.querySelectorAll(".menu-entry.open").forEach(x=>{if(x!==entry)x.classList.remove("open")});entry?.classList.toggle("open");ev.stopPropagation();}});
document.addEventListener("pointerdown",ev=>{if(!els.appMenu?.classList.contains("hidden")&&!els.appMenu.contains(ev.target)&&ev.target!==els.appMenuBtn)closeAppMenu();});
for(const [mode,btn] of Object.entries(MODE_BUTTONS))btn?.addEventListener("click",()=>setMode(mode));
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
els.viewport.addEventListener("pointerup",ev=>{if(state.panning){endPan();return;}if(state.mode==="sam"){samPointerUp(ev);return;}if(state.mode==="pointer"){endPointerEdit();return;}handleDrawPointerUp(ev);});
els.viewport.addEventListener("pointercancel",()=>{endPan();if(state.editing)endPointerEdit();state.sam.drag=null;renderSamOverlay();});
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
