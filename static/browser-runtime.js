"use strict";

(() => {
  const RUNTIME_VERSION = "1.5.0";
  const TIFF_EXTENSIONS = new Set([".tif", ".tiff"]);
  const ULTRALYTICS_URL = "https://esm.sh/@ultralytics/yolo@0.0.41";
  const TIFF_DECODER_URL = "https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js";
  const SLIMSAM_MODEL = "Xenova/slimsam-77-uniform";
  const YOLO_MODEL_URLS = {
    "yolo11-detect": "https://huggingface.co/webnn/yolo11n/resolve/main/onnx/yolo11n.onnx?download=true",
    "yolo11-seg": "https://huggingface.co/MikeLud/ObjectDetectionYOLO11-ONNX/resolve/main/yolo11n-seg.onnx?download=true"
  };

  const runtime = {
    mode: "browser-only",
    webgpu: !!navigator.gpu,
    tiffReady: false,
    sam: {
      worker: null,
      ready: false,
      imageKey: null,
      encodePromise: null,
      requestSeq: 0,
      pending: new Map(),
      loaded: false,
      device: null,
    },
    yolo: {
      module: null,
      models: new Map(),
      devices: new Map(),
    },
  };

  window.helloLabelBrowserRuntime = runtime;

  function english() { return state?.language === "en"; }
  function message(zh, en) { return english() ? en : zh; }
  function extOf(name) {
    const n = String(name || "");
    const dot = n.lastIndexOf(".");
    return dot >= 0 ? n.slice(dot).toLowerCase() : "";
  }

  async function loadClassicScript(url, marker) {
    if (marker && window[marker]) return;
    const existing = [...document.scripts].find(x => x.src === url);
    if (existing) {
      if (marker && window[marker]) return;
      await new Promise((resolve, reject) => {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
      });
      return;
    }
    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", () => reject(new Error(`Failed to load ${url}`)), { once: true });
      document.head.appendChild(script);
    });
  }

  async function imageFromBlob(blob) {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return { img, url };
    } catch (error) {
      URL.revokeObjectURL(url);
      throw error;
    }
  }

  async function decodeTiffLocally(file) {
    await loadClassicScript(TIFF_DECODER_URL, "UTIF");
    if (!window.UTIF) throw new Error("UTIF decoder unavailable");
    const buffer = await file.arrayBuffer();
    const ifds = UTIF.decode(buffer);
    if (!ifds?.length) throw new Error(message("无法读取 TIFF 图像。", "Unable to decode TIFF image."));
    UTIF.decodeImage(buffer, ifds[0]);
    const rgba = UTIF.toRGBA8(ifds[0]);
    const width = Number(ifds[0].width || 0);
    const height = Number(ifds[0].height || 0);
    if (!width || !height) throw new Error(message("TIFF 图像尺寸无效。", "Invalid TIFF dimensions."));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { alpha: false });
    ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(value => value ? resolve(value) : reject(new Error("TIFF conversion failed")), "image/png", 0.96);
    });
    runtime.tiffReady = true;
    return { blob, width, height };
  }

  // Browser-only preview: image bytes never go to /api/preview or any HelloLabel server.
  loadPreview = async function(file) {
    if (!file) throw new Error(message("没有可读取的图片文件。", "No image file was provided."));
    const isTiff = TIFF_EXTENSIONS.has(extOf(file.name));
    let previewBlob = file;
    let width = 0;
    let height = 0;
    if (isTiff) {
      const decoded = await decodeTiffLocally(file);
      previewBlob = decoded.blob;
      width = decoded.width;
      height = decoded.height;
    }
    if (state.previewUrl) {
      try { URL.revokeObjectURL(state.previewUrl); } catch {}
      state.previewUrl = null;
    }
    const { img, url } = await imageFromBlob(previewBlob);
    state.previewUrl = url;
    state.previewBlob = previewBlob;
    state.aiImageToken = null;
    state.width = width || img.naturalWidth || img.width;
    state.height = height || img.naturalHeight || img.height;
    els.imageView.src = url;
    try { await els.imageView.decode(); } catch {}
    els.stage.style.width = `${state.width}px`;
    els.stage.style.height = `${state.height}px`;
    resizeOverlay();
    resetBrowserSamImage();
  };

  const maskIndex = (mask, width, x, y) => y * width + x;

  function boundaryFromMask(mask, width, height) {
    if (!mask || !width || !height) return [];
    const on = (x, y) => x >= 0 && x < width && y >= 0 && y < height && mask[maskIndex(mask, width, x, y)] > 0;
    let start = null;
    for (let y = 0; y < height && !start; y++) {
      for (let x = 0; x < width; x++) {
        if (on(x, y) && (!on(x - 1, y) || !on(x, y - 1) || !on(x + 1, y) || !on(x, y + 1))) {
          start = [x, y];
          break;
        }
      }
    }
    if (!start) return [];
    const dirs = [[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
    const points = [];
    let current = start;
    let prevDir = 4;
    const maxSteps = Math.max(1024, width * height * 2);
    for (let step = 0; step < maxSteps; step++) {
      points.push([current[0] + 0.5, current[1] + 0.5]);
      let found = false;
      const searchStart = (prevDir + 6) % 8;
      for (let k = 0; k < 8; k++) {
        const di = (searchStart + k) % 8;
        const nx = current[0] + dirs[di][0], ny = current[1] + dirs[di][1];
        if (!on(nx, ny)) continue;
        current = [nx, ny];
        prevDir = di;
        found = true;
        break;
      }
      if (!found) break;
      if (points.length > 3 && current[0] === start[0] && current[1] === start[1]) break;
    }
    return points;
  }

  function boundsOf(points) {
    if (!points?.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const [x, y] of points) {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    }
    return { minX, minY, maxX, maxY };
  }

  const cross = (o, a, b) => (a[0]-o[0])*(b[1]-o[1]) - (a[1]-o[1])*(b[0]-o[0]);

  function convexHull(points) {
    const pts = [...new Map(points.map(p => [`${p[0]},${p[1]}`, p])).values()].sort((a,b) => a[0]-b[0] || a[1]-b[1]);
    if (pts.length <= 2) return pts;
    const lower = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower.at(-2), lower.at(-1), p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper.at(-2), upper.at(-1), p) <= 0) upper.pop();
      upper.push(p);
    }
    lower.pop(); upper.pop();
    return lower.concat(upper);
  }

  function minAreaRect(points) {
    const hull = convexHull(points);
    if (hull.length < 2) return null;
    let best = null;
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length];
      const angle = -Math.atan2(b[1]-a[1], b[0]-a[0]);
      const c = Math.cos(angle), s = Math.sin(angle);
      let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
      for (const p of hull) {
        const x = p[0]*c - p[1]*s, y = p[0]*s + p[1]*c;
        minX=Math.min(minX,x); minY=Math.min(minY,y); maxX=Math.max(maxX,x); maxY=Math.max(maxY,y);
      }
      const area=(maxX-minX)*(maxY-minY);
      if (!best || area < best.area) best={area,angle,minX,minY,maxX,maxY};
    }
    const c=Math.cos(-best.angle), s=Math.sin(-best.angle);
    const unrotate=([x,y])=>[x*c-y*s,x*s+y*c];
    return [unrotate([best.minX,best.minY]),unrotate([best.maxX,best.minY]),unrotate([best.maxX,best.maxY]),unrotate([best.minX,best.maxY])];
  }

  const circle2=(a,b)=>{const x=(a[0]+b[0])/2,y=(a[1]+b[1])/2;return{x,y,r:Math.hypot(a[0]-x,a[1]-y)}};
  function circle3(a,b,c){const d=2*(a[0]*(b[1]-c[1])+b[0]*(c[1]-a[1])+c[0]*(a[1]-b[1]));if(Math.abs(d)<1e-9)return null;const aa=a[0]**2+a[1]**2,bb=b[0]**2+b[1]**2,cc=c[0]**2+c[1]**2;const x=(aa*(b[1]-c[1])+bb*(c[1]-a[1])+cc*(a[1]-b[1]))/d,y=(aa*(c[0]-b[0])+bb*(a[0]-c[0])+cc*(b[0]-a[0]))/d;return{x,y,r:Math.hypot(a[0]-x,a[1]-y)}}
  const inCircle=(p,c)=>!!c&&Math.hypot(p[0]-c.x,p[1]-c.y)<=c.r+1e-6;
  function minimumEnclosingCircle(points){const pts=points.slice();for(let i=pts.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pts[i],pts[j]]=[pts[j],pts[i]];}let c=null;for(let i=0;i<pts.length;i++){if(inCircle(pts[i],c))continue;c={x:pts[i][0],y:pts[i][1],r:0};for(let j=0;j<i;j++){if(inCircle(pts[j],c))continue;c=circle2(pts[i],pts[j]);for(let k=0;k<j;k++){if(inCircle(pts[k],c))continue;c=circle3(pts[i],pts[j],pts[k])||c;}}}return c;}

  function geometryFromMask(mask, width, height, outputType) {
    let boundary = boundaryFromMask(mask, width, height);
    if (!boundary.length) throw new Error(message("AI 没有生成有效区域。", "AI returned an empty mask."));
    if (typeof rdp === "function" && boundary.length > 24) boundary = rdp(boundary, Math.max(1.2, Math.sqrt(width*height)/900));
    if (outputType === "polygon") return boundary;
    const box = boundsOf(boundary);
    if (outputType === "rectangle") return [[box.minX,box.minY],[box.maxX,box.maxY]];
    if (outputType === "oriented_rectangle") return minAreaRect(boundary) || [[box.minX,box.minY],[box.maxX,box.minY],[box.maxX,box.maxY],[box.minX,box.maxY]];
    if (outputType === "circle") {
      const c = minimumEnclosingCircle(boundary);
      return c ? [[c.x,c.y],[c.x+c.r,c.y]] : [[(box.minX+box.maxX)/2,(box.minY+box.maxY)/2],[box.maxX,(box.minY+box.maxY)/2]];
    }
    return boundary;
  }

  function resetBrowserSamImage() {
    const sam = runtime.sam;
    sam.imageKey = null;
    sam.encodePromise = null;
    if (sam.worker) try { sam.worker.postMessage({ type:"reset" }); } catch {}
  }

  function ensureSamWorker() {
    const sam = runtime.sam;
    if (sam.worker) return sam.worker;
    const worker = new Worker("/static/sam-worker.js?v=hellolabel-v150", { type:"module" });
    sam.worker = worker;
    worker.addEventListener("message", event => {
      const data = event.data || {};
      if (data.type === "ready" || data.type === "encoded") {
        sam.ready = true; sam.loaded = true; sam.device = data.device || sam.device;
      }
      if (data.id && sam.pending.has(data.id)) {
        const item=sam.pending.get(data.id); sam.pending.delete(data.id);
        data.error ? item.reject(new Error(data.error)) : item.resolve(data);
      }
    });
    worker.addEventListener("error", event => {
      for (const item of sam.pending.values()) item.reject(event.error || new Error(event.message || "SAM worker failed"));
      sam.pending.clear();
    });
    return worker;
  }

  function samRequest(type, payload={}, transfer=[]) {
    const sam=runtime.sam, worker=ensureSamWorker(), id=`sam-${Date.now()}-${++sam.requestSeq}`;
    return new Promise((resolve,reject)=>{sam.pending.set(id,{resolve,reject});worker.postMessage({id,type,...payload},transfer);});
  }

  async function ensureSamImageEncoded() {
    if (!state.imageFile) throw new Error(message("请先打开图片。", "Open an image first."));
    const original=state.imageFile, file=state.previewBlob||original;
    const key=`${original.name}:${original.size}:${original.lastModified}`;
    if (runtime.sam.imageKey===key&&runtime.sam.encodePromise) return runtime.sam.encodePromise;
    const buffer=await file.arrayBuffer();
    runtime.sam.imageKey=key;
    runtime.sam.encodePromise=samRequest("encode",{buffer,mime:file.type||"application/octet-stream",name:original.name},[buffer]);
    return runtime.sam.encodePromise;
  }

  function samPromptsForWorker() {
    const points=state.sam.points.map((p,i)=>({x:p[0]/Math.max(1,state.width),y:p[1]/Math.max(1,state.height),label:Number(state.sam.labels[i]??1)}));
    if(state.sam.box){const[x1,y1,x2,y2]=state.sam.box,cx=(x1+x2)/2,cy=(y1+y2)/2,ix=Math.max(2,Math.abs(x2-x1)*.08),iy=Math.max(2,Math.abs(y2-y1)*.08);for(const[x,y]of[[cx,cy],[x1+ix,y1+iy],[x2-ix,y1+iy],[x2-ix,y2-iy],[x1+ix,y2-iy]])points.push({x:x/Math.max(1,state.width),y:y/Math.max(1,state.height),label:1});}
    return points;
  }

  runSamPrediction = async function() {
    if(!state.imageFile||(state.sam.points.length===0&&!state.sam.box)){state.sam.preview=null;renderSamOverlay();return;}
    const seq=++state.sam.requestSeq;
    setBusy(true,message("浏览器本地 SAM 推理中...","Running SAM locally in the browser..."));
    try{
      await ensureSamImageEncoded();
      const result=await samRequest("decode",{prompts:samPromptsForWorker()});
      if(seq!==state.sam.requestSeq)return;
      const points=geometryFromMask(new Uint8Array(result.mask),Number(result.width),Number(result.height),els.samOutputSelect.value);
      state.sam.preview={label:"",points,shape_type:els.samOutputSelect.value,group_id:null,description:"",flags:{},mask:null,_score:Number(result.score||0),_model:`browser:${SLIMSAM_MODEL}`};
      renderSamOverlay();
      setStatus(message(`浏览器 AI 候选已更新，score ${Number(result.score||0).toFixed(3)}。Enter 接受。`,`Browser AI candidate updated, score ${Number(result.score||0).toFixed(3)}. Press Enter to accept.`));
    }catch(error){if(seq===state.sam.requestSeq){state.sam.preview=null;renderSamOverlay();setStatus(error?.message||String(error),true);alert(message(`浏览器 SAM 推理失败：${error?.message||error}`,`Browser SAM failed: ${error?.message||error}`));}}
    finally{if(seq===state.sam.requestSeq)setBusy(false);}
  };

  async function loadYoloModule(){if(!runtime.yolo.module)runtime.yolo.module=import(ULTRALYTICS_URL);return runtime.yolo.module;}
  async function loadYoloModel(modelId){if(runtime.yolo.models.has(modelId))return runtime.yolo.models.get(modelId);const url=YOLO_MODEL_URLS[modelId];if(!url)throw new Error(message("当前浏览器版本暂不支持 YOLO-World。","YOLO-World is not yet available in the browser-only runtime."));const promise=(async()=>{const{YOLO}=await loadYoloModule();const model=await YOLO.load(url,{device:"auto"});runtime.yolo.devices.set(modelId,model.device||"auto");return model;})();runtime.yolo.models.set(modelId,promise);try{return await promise;}catch(error){runtime.yolo.models.delete(modelId);throw error;}}

  function parseColor(value){if(Array.isArray(value)&&value.length>=3)return value.slice(0,3).map(Number);if(typeof value==="string"){const hex=value.match(/^#?([0-9a-f]{6})$/i)?.[1];if(hex)return[parseInt(hex.slice(0,2),16),parseInt(hex.slice(2,4),16),parseInt(hex.slice(4,6),16)];const nums=value.match(/\d+(?:\.\d+)?/g)?.map(Number);if(nums?.length>=3)return nums.slice(0,3);}return null;}

  function maskForDetection(results,box){const rgba=results?.masks,width=Number(results?.width||state.width),height=Number(results?.height||state.height);if(!(rgba instanceof Uint8Array)||rgba.length<width*height*4)return null;const color=parseColor(box.color),x1=Math.max(0,Math.floor(box.x1)),y1=Math.max(0,Math.floor(box.y1)),x2=Math.min(width-1,Math.ceil(box.x2)),y2=Math.min(height-1,Math.ceil(box.y2)),mask=new Uint8Array(width*height);let hits=0;for(let y=y1;y<=y2;y++)for(let x=x1;x<=x2;x++){const p=(y*width+x)*4,alpha=rgba[p+3];if(!alpha)continue;let match=true;if(color)match=Math.abs(rgba[p]-color[0])<=8&&Math.abs(rgba[p+1]-color[1])<=8&&Math.abs(rgba[p+2]-color[2])<=8;if(match){mask[y*width+x]=1;hits++;}}return hits?{mask,width,height}:null;}

  runYolo = async function() {
    if(!state.imageFile)return;
    const modelId=els.yoloModelSelect.value;
    if(modelId==="yolo-world"){alert(message("纯浏览器 v1.5 暂不提供 YOLO-World；YOLO11 Detect/Seg 已完全本地化。","Browser-only v1.5 does not yet provide YOLO-World; YOLO11 Detect/Seg run fully locally."));return;}
    setBusy(true,message("浏览器本地 YOLO 推理中...","Running YOLO locally in the browser..."));
    try{
      const model=await loadYoloModel(modelId),conf=Number(els.yoloConf.value||.25),iou=Number(els.yoloIou.value||.5);
      const results=await model.predict(state.previewBlob||state.imageFile,{conf,iou});
      let items=Array.isArray(results?.boxes)?results.boxes:[];
      const requested=new Set(String(els.yoloTextInput.value||"").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean));
      if(requested.size)items=items.filter(item=>requested.has(String(item.name||item.cls).toLowerCase()));
      if(!items.length){setStatus(t("noDetections"));return;}
      pushHistory();let count=0;
      for(const item of items){const label=String(item.name||item.cls||"object");let type="rectangle",points=[[Number(item.x1),Number(item.y1)],[Number(item.x2),Number(item.y2)]];if(modelId==="yolo11-seg"&&els.yoloOutputSelect.value!=="rectangle"){const localMask=maskForDetection(results,item);if(localMask)try{type=els.yoloOutputSelect.value;points=geometryFromMask(localMask.mask,localMask.width,localMask.height,type);}catch{type="rectangle";}}if(!state.data.hellolabel.labels[label])state.data.hellolabel.labels[label]={color:stableColor(label)};const id=uid();state.data.shapes.push(makeShape(label,type,points));state.runtimeIds.push(id);state.runtimeMeta[id]={source:`browser:${modelId}`,score:Number(item.conf??0)};count++;}
      markDirty(t("aiAdded",{count}));renderAll();if(count===1)selectId(shapeIds().at(-1),{scroll:true,ensure:true});setStatus(message(`浏览器本地 AI 已新增 ${count} 个实例。`,`Browser AI added ${count} instance(s).`));
    }catch(error){setStatus(error?.message||String(error),true);alert(message(`浏览器 YOLO 推理失败：${error?.message||error}`,`Browser YOLO failed: ${error?.message||error}`));}
    finally{setBusy(false);}
  };

  async function cacheSummary(){try{if(!("caches"in window))return"Cache Storage unavailable";return`${(await caches.keys()).length} cache(s)`;}catch{return"Cache status unavailable";}}

  showModelStatus = async function() {
    const cache=await cacheSummary(),rows=[["Runtime",`Browser-only ${RUNTIME_VERSION}`],["WebGPU",runtime.webgpu?"available":"unavailable; CPU/WASM fallback"],["SlimSAM",runtime.sam.loaded?`loaded (${runtime.sam.device||"local"})`:"not loaded"],["YOLO11 Detect",runtime.yolo.models.has("yolo11-detect")?"loaded":"not loaded"],["YOLO11 Seg",runtime.yolo.models.has("yolo11-seg")?"loaded":"not loaded"],["YOLO-World","not yet available in browser-only runtime"],["Browser cache",cache],["Image upload","disabled (local files never sent to HelloLabel server)"]];
    await showModal({title:t("aiModelStatus"),body:`<table class="model-table"><tbody>${rows.map(([a,b])=>`<tr><td>${escapeHtml(a)}</td><td>${escapeHtml(b)}</td></tr>`).join("")}</tbody></table>`,buttons:[{label:t("close"),value:"ok",className:"primary"}]});
  };

  async function primeBrowserModels(){const ok=await confirmModal(message("安装浏览器 AI","Install Browser AI"),message("AI 将直接下载到当前浏览器缓存并在本机运行，不会安装到 ECS。首次下载可能需要几十到数百 MB，是否继续？","AI files will be downloaded into this browser's cache and run on this device, not on the ECS server. The first download may use tens to hundreds of MB. Continue?"),message("开始下载","Download"));if(!ok)return;setBusy(true,message("正在下载并初始化浏览器 AI...","Downloading and initializing browser AI..."));try{ensureSamWorker();await Promise.allSettled([loadYoloModel("yolo11-detect"),loadYoloModel("yolo11-seg"),samRequest("warmup")]);setStatus(message("浏览器 AI 已初始化；模型由浏览器缓存。","Browser AI initialized; models are cached by the browser."));}finally{setBusy(false);}}
  installAIFromMenu=primeBrowserModels;

  if(els.samModelSelect){els.samModelSelect.replaceChildren();const option=document.createElement("option");option.value="slimsam";option.textContent="SlimSAM (Browser)";els.samModelSelect.appendChild(option);}
  if(els.yoloModelSelect){const world=[...els.yoloModelSelect.options].find(x=>x.value==="yolo-world");if(world)world.textContent="YOLO-World (Browser: pending)";}

  if(typeof I18N!=="undefined"){
    if(I18N.zh){I18N.zh.installAI="下载浏览器 AI";I18N.zh.modelStatusNote="所有推理均在当前浏览器执行；模型首次使用时下载并由浏览器缓存。图片和 JSON 不上传 HelloLabel 服务器。";I18N.zh.readModelStatus="读取浏览器 AI 状态...";}
    if(I18N.en){I18N.en.installAI="Download Browser AI";I18N.en.modelStatusNote="All inference runs in this browser. Models download on first use and are browser-cached. Images and JSON are never uploaded to the HelloLabel server.";I18N.en.readModelStatus="Reading browser AI status...";}
    try{applyLanguage(state.language,false);}catch{}
  }

  const originalFetch=window.fetch.bind(window);
  window.fetch=function(input,init){const url=typeof input==="string"?input:input?.url;if(typeof url==="string"&&/^\/api\//.test(url))return Promise.reject(new Error(`HelloLabel v${RUNTIME_VERSION} is browser-only; server API call blocked: ${url}`));return originalFetch(input,init);};
})();
