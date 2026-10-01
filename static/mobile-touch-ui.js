"use strict";

// Mobile touch UI layer.
// Reuses desktop state/data sources instead of cloning desktop DOM.
(() => {
  function initMobileTouchUI() {
    const viewport = document.getElementById("viewport");
    if (!viewport) return;

    const style = document.createElement("style");
    style.textContent = `
      .mobile-touch-action-bar,.mobile-drawer,.mobile-drawer-mask,.mobile-drawer-btn{display:none}
      html.hellolabel-mobile .mobile-touch-action-bar{
        display:flex;position:fixed;left:12px;right:12px;
        bottom:max(12px,env(safe-area-inset-bottom));z-index:80;
        min-height:54px;border-radius:18px;padding:8px;gap:8px;
        background:color-mix(in srgb,var(--panel) 94%,transparent);
        border:1px solid var(--line);box-shadow:var(--shadow);backdrop-filter:blur(12px);
      }
      html.hellolabel-mobile .mobile-touch-action-bar button{flex:1;min-height:44px;min-width:48px}
      html.hellolabel-mobile .mobile-drawer-btn{
        display:grid;position:fixed;z-index:70;width:52px;height:44px;
        border-radius:14px;padding:0;place-items:center;
      }
      html.hellolabel-mobile .mobile-images-btn{left:12px;top:12px}
      html.hellolabel-mobile .mobile-labels-btn{right:12px;top:12px}
      html.hellolabel-mobile .mobile-drawer-mask{
        position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:90;
      }
      html.hellolabel-mobile .mobile-drawer{
        position:fixed;left:0;right:0;bottom:0;height:72vh;z-index:100;
        border-radius:24px 24px 0 0;background:var(--panel);
        border-top:1px solid var(--line);box-shadow:0 -12px 32px rgba(0,0,0,.3);
        padding:16px;overflow:auto;
      }
      .mobile-list-item{padding:12px;border-radius:12px;border:1px solid var(--line);margin-bottom:8px}
      .mobile-list-item.active{border-color:var(--accent);background:var(--panel2)}
      .touch-crosshair{display:none;position:absolute;width:32px;height:32px;margin:-16px;pointer-events:none;z-index:40}
      html.hellolabel-touch-mode .touch-crosshair.active{display:block}
      .touch-crosshair::before,.touch-crosshair::after{content:"";position:absolute;background:#fff;box-shadow:0 0 4px #000}
      .touch-crosshair::before{left:15px;top:0;width:2px;height:32px}
      .touch-crosshair::after{left:0;top:15px;width:32px;height:2px}
    `;
    document.head.appendChild(style);

    const bar=document.createElement("div");
    bar.className="mobile-touch-action-bar";
    bar.innerHTML=`<button data-touch-action="undo">↶ 撤销</button><button data-touch-action="finish">✓ 完成</button><button data-touch-action="cancel">× 取消</button>`;
    document.body.appendChild(bar);

    const mask=document.createElement("div");
    mask.className="mobile-drawer-mask";
    document.body.appendChild(mask);

    const drawer=document.createElement("div");
    drawer.className="mobile-drawer";
    drawer.innerHTML=`<h3></h3><div id="mobileDrawerContent"></div>`;
    document.body.appendChild(drawer);

    function getSharedState(){
      return window.state || window.helloLabelState || null;
    }

    function renderImages(){
      const state=getSharedState();
      const root=document.getElementById("mobileDrawerContent");
      root.innerHTML="";
      const images=state?.data?.images || state?.images || [];
      if(!images.length){root.textContent="暂无图片";return;}
      images.forEach((image,index)=>{
        const item=document.createElement("div");
        item.className="mobile-list-item";
        item.textContent=image.name || image.fileName || `Image ${index+1}`;
        if(index===state?.currentImageIndex)item.classList.add("active");
        item.onclick=()=>{
          if(typeof window.selectImageByIndex==="function") window.selectImageByIndex(index);
          else if(typeof state?.setCurrentImage==="function") state.setCurrentImage(index);
          closeDrawer();
        };
        root.appendChild(item);
      });
    }

    function renderLabels(){
      const state=getSharedState();
      const root=document.getElementById("mobileDrawerContent");
      root.innerHTML="";
      const shapes=state?.data?.shapes || state?.annotation?.shapes || state?.shapes || [];
      if(!shapes.length){root.textContent="暂无标注";return;}
      shapes.forEach((shape,index)=>{
        const item=document.createElement("div");
        item.className="mobile-list-item";
        item.textContent=shape.label || shape.shape_type || `Shape ${index+1}`;
        item.onclick=()=>{
          if(typeof window.selectShapeByIndex==="function") window.selectShapeByIndex(index);
          else if(typeof window.setPrimaryShape==="function") window.setPrimaryShape(shape.id);
          closeDrawer();
        };
        root.appendChild(item);
      });
    }

    function openDrawer(type){
      drawer.querySelector("h3").textContent=type==="images"?"图片列表":"标签 / 实例";
      drawer.dataset.type=type;
      if(type==="images")renderImages();else renderLabels();
      drawer.style.display="block";
      mask.style.display="block";
    }
    function closeDrawer(){drawer.style.display="none";mask.style.display="none"}

    const imageBtn=document.createElement("button");
    imageBtn.className="mobile-drawer-btn mobile-images-btn";
    imageBtn.textContent="图片";
    const labelBtn=document.createElement("button");
    labelBtn.className="mobile-drawer-btn mobile-labels-btn";
    labelBtn.textContent="标签";
    document.body.append(imageBtn,labelBtn);
    imageBtn.onclick=()=>openDrawer("images");
    labelBtn.onclick=()=>openDrawer("labels");
    mask.onclick=closeDrawer;

    const cross=document.createElement("div");
    cross.className="touch-crosshair";
    viewport.appendChild(cross);
    viewport.addEventListener("pointermove",event=>{
      if(event.pointerType!=="touch")return;
      const r=viewport.getBoundingClientRect();
      cross.style.left=`${event.clientX-r.left}px`;
      cross.style.top=`${event.clientY-r.top}px`;
      cross.classList.add("active");
    },{passive:true});

    window.mobileTouchUI={
      setToolState(tool,count=0){
        const finish=bar.querySelector('[data-touch-action="finish"]');
        if(finish) finish.textContent=tool==="polygon"||tool==="polyline"?`✓ 完成 ${count?`(${count})`:""}`:"✓ 完成";
      },
      showAction(name,visible=true){
        const btn=bar.querySelector(`[data-touch-action="${name}"]`);
        if(btn)btn.style.display=visible?"block":"none";
      },
      refreshDrawer(){
        if(drawer.style.display!=="block")return;
        drawer.dataset.type==="images"?renderImages():renderLabels();
      }
    };
  }

  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",initMobileTouchUI,{once:true});
  else initMobileTouchUI();
})();
