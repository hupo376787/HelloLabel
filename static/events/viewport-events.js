"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function isTouchActionEvent(event){
    return !!event?.target?.closest?.(".hellolabel-touch-actions");
  }

  function bind() {
    const {
      state,els,zoomAt,startPan,samPointerDown,beginPointerEdit,handleDrawPointerDown,
      movePan,samPointerMove,movePointerEdit,handleDrawPointerMove,endPan,samPointerUp,
      endPointerEdit,handleDrawPointerUp,cancelPointerEdit,renderSamOverlay,
      insertVertexAtDoubleClick,dist2,finishSequenceDrawing,resizeOverlay,
      scheduleViewportRender,scheduleInstanceListRender
    }=c;

    els.viewport.addEventListener("wheel",event=>{
      if(!state.data)return;
      event.preventDefault();
      zoomAt(event.deltaY<0?1.12:.89,event.clientX,event.clientY);
    },{passive:false});

    els.viewport.addEventListener("contextmenu",event=>{
      if(state.mode==="sam")event.preventDefault();
    });

    els.viewport.addEventListener("pointerdown",event=>{
      if(isTouchActionEvent(event))return;
      if(!state.data)return;
      if(startPan(event))return;
      if(state.mode==="sam"){samPointerDown(event);return;}
      if(state.mode==="pointer"){beginPointerEdit(event);return;}
      handleDrawPointerDown(event);
    });

    els.viewport.addEventListener("pointermove",event=>{
      if(isTouchActionEvent(event))return;
      if(state.panning){movePan(event);return;}
      if(state.mode==="sam"){samPointerMove(event);return;}
      if(state.mode==="pointer"){movePointerEdit(event);return;}
      handleDrawPointerMove(event);
    });

    els.viewport.addEventListener("pointerup",event=>{
      if(isTouchActionEvent(event))return;
      try{
        if(state.panning){endPan();return;}
        if(state.mode==="sam"){samPointerUp(event);return;}
        if(state.mode==="pointer"){endPointerEdit();return;}
        handleDrawPointerUp(event);
      }finally{
        window.helloLabelPointerInput?.release?.(event.pointerId);
      }
    });

    els.viewport.addEventListener("pointercancel",event=>{
      if(isTouchActionEvent(event))return;
      endPan();
      if(state.editing)cancelPointerEdit();
      if(state.sam.drag?.pointerId===event.pointerId)state.sam.drag=null;
      window.helloLabelPointerInput?.release?.(event.pointerId);
      renderSamOverlay();
    });

    els.viewport.addEventListener("auxclick",event=>{
      if(event.button===1)event.preventDefault();
    });

    els.viewport.addEventListener("dblclick",event=>{
      if(state.mode==="pointer"){
        insertVertexAtDoubleClick(event);
        return;
      }

      const drawing=state.drawing;
      if(!drawing||(drawing.type!=="polygon"&&drawing.type!=="linestrip"))return;

      if(
        drawing.points.length>=2
        &&Math.sqrt(dist2(drawing.points.at(-1),drawing.points.at(-2)))*state.scale<12
      ){
        drawing.points.pop();
      }

      const minimum=drawing.type==="polygon"?3:2;
      if(drawing.points.length>=minimum)finishSequenceDrawing();
    });

    window.addEventListener("resize",()=>{
      resizeOverlay();
      scheduleViewportRender();
      scheduleInstanceListRender();
    });
  }

  const api={configure,bind};
  window.HelloLabelViewportEvents=api;
})();
