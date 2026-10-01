"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function nearestEditableSegment(shape,point,pointerType=null) {
    const {state,pointSegDistance,pointerProfile}=c;
    const type=shape.shape_type;
    if(type!=="polygon"&&type!=="linestrip")return null;

    const points=shape.points||[];
    if(points.length<2)return null;

    let best=null,bestDistance=Infinity;
    const end=type==="polygon"?points.length:points.length-1;

    for(let i=0;i<end;i++){
      const next=(i+1)%points.length;
      const distance=pointSegDistance(point,points[i],points[next]);
      if(distance<bestDistance){
        bestDistance=distance;
        best=i;
      }
    }

    return bestDistance*state.scale<=pointerProfile(pointerType).edgeHitPx?best:null;
  }

  function insertVertexAtDoubleClick(event) {
    const {
      state,primaryShape,clampImagePoint,screenToImage,
      pushHistory,markDirty,t,renderAll,selectId
    }=c;

    if(state.mode!=="pointer"||!state.primaryId)return;

    const shape=primaryShape();
    const point=clampImagePoint(screenToImage(event.clientX,event.clientY));
    const segment=nearestEditableSegment(shape,point,event.pointerType);
    if(segment==null)return;

    pushHistory();
    shape.points.splice(segment+1,0,point);
    state.activeHandle={index:segment+1,kind:"point"};
    markDirty(t("vertexInserted"));
    renderAll();
    selectId(state.primaryId);
    event.preventDefault();
  }

  function deleteActiveVertex() {
    const {state,primaryShape,pushHistory,markDirty,t,renderAll,selectId}=c;
    const shape=primaryShape();
    const handle=state.activeHandle;
    if(!shape||!handle)return false;

    if(shape.shape_type==="polygon"&&shape.points.length>3){
      pushHistory();
      shape.points.splice(handle.index,1);
      state.activeHandle=null;
      markDirty(t("polygonVertexDeleted"));
      renderAll();
      selectId(state.primaryId);
      return true;
    }

    if(shape.shape_type==="linestrip"&&shape.points.length>2){
      pushHistory();
      shape.points.splice(handle.index,1);
      state.activeHandle=null;
      markDirty(t("linestripVertexDeleted"));
      renderAll();
      selectId(state.primaryId);
      return true;
    }

    return false;
  }

  function deleteSelected() {
    const {state,shapeIds,pushHistory,clearSelection,markDirty,t,renderAll}=c;
    if(!state.data||!state.primaryId)return;
    if(deleteActiveVertex())return;

    const ids=[...state.selectedIds];
    pushHistory();
    const currentIds=shapeIds();

    for(let i=state.data.shapes.length-1;i>=0;i--){
      const id=currentIds[i];
      if(ids.includes(id)){
        state.data.shapes.splice(i,1);
        state.runtimeIds.splice(i,1);
        delete state.runtimeMeta[id];
      }
    }

    clearSelection();
    markDirty(t("instancesDeleted",{count:ids.length}));
    renderAll();
  }

  const api={
    configure,
    nearestEditableSegment,
    insertVertexAtDoubleClick,
    deleteActiveVertex,
    deleteSelected
  };

  window.HelloLabelEditCommands=api;
})();
