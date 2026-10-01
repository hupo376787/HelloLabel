"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function clearSelection() {
    const {
      state,updateSelectionPanel,renderSelectedOverlay,
      scheduleInstanceListRender,updateActionButtons
    }=c;

    state.selectedIds.clear();
    state.primaryId=null;
    state.activeHandle=null;
    updateSelectionPanel();
    renderSelectedOverlay();
    scheduleInstanceListRender();
    updateActionButtons();
    window.HelloLabelDrawingState?.idle?.();
  }

  function selectId(id,{scroll=false,ensure=false,additive=false}={}) {
    const {
      state,shapeAtId,updateSelectionPanel,renderSelectedOverlay,
      scheduleInstanceListRender,updateActionButtons,scrollInstanceToId,primaryShape
    }=c;

    if(!id||!shapeAtId(id)){
      clearSelection();
      return;
    }

    if(additive){
      if(state.selectedIds.has(id)){
        state.selectedIds.delete(id);
        if(state.primaryId===id){
          state.primaryId=[...state.selectedIds].at(-1)||null;
        }
      }else{
        state.selectedIds.add(id);
        state.primaryId=id;
      }
    }else{
      state.selectedIds=new Set([id]);
      state.primaryId=id;
    }

    state.activeHandle=null;
    updateSelectionPanel();
    renderSelectedOverlay();
    scheduleInstanceListRender();
    updateActionButtons();

    if(scroll)scrollInstanceToId(id);
    if(ensure)ensureShapeVisible(id);

    const selected=primaryShape();
    if(selected&&state.primaryId){
      window.HelloLabelDrawingState?.selected?.(state.primaryId,selected.label);
    }else{
      window.HelloLabelDrawingState?.idle?.();
    }
  }

  function ensureShapeVisible(id) {
    const {
      state,els,shapeAtId,imageToViewport,shapeAnchor,scheduleViewportRender
    }=c;

    const shape=shapeAtId(id);
    if(!shape)return;

    const anchor=imageToViewport(...shapeAnchor(shape));
    const rect=els.viewport.getBoundingClientRect();
    const margin=60;

    if(
      anchor[0]>=margin&&anchor[0]<=rect.width-margin&&
      anchor[1]>=margin&&anchor[1]<=rect.height-margin
    )return;

    const shapeCenter=shapeAnchor(shape);
    state.panX=rect.width/2-shapeCenter[0]*state.scale;
    state.panY=rect.height/2-shapeCenter[1]*state.scale;
    scheduleViewportRender();
  }

  function updateSelectionPanel() {
    const {
      state,els,primaryShape,primaryIndex,shapeMeta,shapeTypeText,t
    }=c;

    const shape=primaryShape();
    els.noSelection.classList.toggle("hidden",!!shape);
    els.selectionInfo.classList.toggle("hidden",!shape);
    if(!shape)return;

    const index=primaryIndex();
    const meta=shapeMeta(state.primaryId);

    els.selNumber.textContent=index>=0?`#${index+1}`:"--";
    els.selLabel.textContent=shape.label;
    els.selType.textContent=shapeTypeText(shape.shape_type);
    els.selPoints.textContent=String(shape.points?.length||0);
    els.selSource.textContent=(meta.source&&meta.source!=="manual")?meta.source:t("manual");
  }

  const api={
    configure,
    clearSelection,
    selectId,
    ensureShapeVisible,
    updateSelectionPanel
  };

  window.HelloLabelSelection=api;
})();
