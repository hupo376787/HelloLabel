"use strict";

(() => {
  let c=null;

  function configure(context) {
    c=context||null;
    return api;
  }

  function imageToViewport(x,y) {
    const {state}=c;
    return [state.panX+Number(x)*state.scale,state.panY+Number(y)*state.scale];
  }

  function screenToImage(clientX,clientY) {
    const {state,els}=c;
    const rect=els.viewport.getBoundingClientRect();
    return [
      (clientX-rect.left-state.panX)/state.scale,
      (clientY-rect.top-state.panY)/state.scale
    ];
  }

  function pointerProfile(pointerType=null) {
    return window.helloLabelPointerInput?.profileFor?.(pointerType)
      || {pointerType:"mouse",shapeHitPx:8,vertexHitPx:10,edgeHitPx:9,polygonStartHitPx:12,allowHover:true};
  }

  function clampImagePoint(point) {
    const {state,clamp}=c;
    return [
      clamp(point[0],0,Math.max(0,state.width-1)),
      clamp(point[1],0,Math.max(0,state.height-1))
    ];
  }

  function drawFallback2D(showLabels) {
    const {
      state,els,OUTLINE_PX,POINT_PX,LABEL_FONT_PX,
      resizeOverlay,labelColor,renderVertices,isClosedType,shapeAnchor
    }=c;

    const {dpr}=resizeOverlay();
    const ctx=els.shapeCanvas.getContext("2d");
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,els.shapeCanvas.width,els.shapeCanvas.height);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.lineWidth=OUTLINE_PX;
    ctx.lineJoin="round";
    ctx.lineCap="round";

    for (const [id,shape] of state.shapeById) {
      if (state.editing?.id===id) continue;

      ctx.strokeStyle=labelColor(shape.label);
      ctx.fillStyle=labelColor(shape.label);
      const vertices=renderVertices(shape);

      if (shape.shape_type==="point") {
        const point=imageToViewport(...vertices[0]);
        ctx.beginPath();
        ctx.arc(point[0],point[1],POINT_PX,0,Math.PI*2);
        ctx.fill();
        continue;
      }

      if (!vertices.length) continue;

      ctx.beginPath();
      ctx.moveTo(...imageToViewport(...vertices[0]));
      for (let i=1;i<vertices.length;i++) {
        ctx.lineTo(...imageToViewport(...vertices[i]));
      }
      if (isClosedType(shape.shape_type)) ctx.closePath();
      ctx.stroke();

      if (showLabels) {
        const anchor=imageToViewport(...shapeAnchor(shape));
        ctx.font=`800 ${LABEL_FONT_PX}px Segoe UI`;
        ctx.lineWidth=3;
        ctx.strokeStyle="#111";
        ctx.strokeText(shape.label,anchor[0],anchor[1]);
        ctx.fillStyle=labelColor(shape.label);
        ctx.fillText(shape.label,anchor[0],anchor[1]);
      }
    }
  }

  function scheduleViewportRender() {
    const {state}=c;
    if (state.transformRaf) return;
    state.transformRaf=requestAnimationFrame(()=>{
      state.transformRaf=0;
      applyTransformNow();
    });
  }

  function applyTransformNow() {
    const {
      state,els,resizeOverlay,shouldWebglShowLabels,
      renderSelectedOverlay,renderDrawingOverlay,renderSamOverlay
    }=c;

    els.stage.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.scale})`;
    els.zoomLabel.textContent=`${Math.round(state.scale*100)}%`;
    resizeOverlay();

    const showLabels=shouldWebglShowLabels();
    if (state.webglReady) {
      state.glRenderer.draw({
        panX:state.panX,
        panY:state.panY,
        scale:Math.max(.0001,state.scale),
        showLabels
      });
    } else {
      drawFallback2D(showLabels);
    }

    renderSelectedOverlay();
    renderDrawingOverlay();
    renderSamOverlay();
  }

  const api={
    configure,
    imageToViewport,
    screenToImage,
    pointerProfile,
    clampImagePoint,
    drawFallback2D,
    scheduleViewportRender,
    applyTransformNow
  };

  window.HelloLabelViewportRenderer=api;
})();
