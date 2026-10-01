"use strict";

(() => {
  let c=null;

  function configure(context) {
    c=context||null;
    return api;
  }

  function findShapeAt(x,y,pointerType=null) {
    const {state,HIT_GRID,pointerProfile,shapeAtId,shapeHit}=c;
    const gx=Math.floor(x/HIT_GRID);
    const gy=Math.floor(y/HIT_GRID);
    const ids=state.shapeGrid.get(`${gx},${gy}`)||[];
    const profile=pointerProfile(pointerType);
    const tolerance=Math.max(4,profile.shapeHitPx/state.scale);

    let best=null;
    let bestArea=Infinity;

    for (let i=ids.length-1;i>=0;i--) {
      const id=ids[i];
      const shape=shapeAtId(id);
      if (!shape||!shapeHit(shape,x,y,tolerance)) continue;

      const bounds=state.boundsById.get(id);
      const area=Math.max(1,(bounds[2]-bounds[0])*(bounds[3]-bounds[1]));
      if (area<=bestArea) {
        best={id,shape};
        bestArea=area;
      }
    }

    return best;
  }

  const api={configure,findShapeAt};
  window.HelloLabelHitTest=api;
})();
