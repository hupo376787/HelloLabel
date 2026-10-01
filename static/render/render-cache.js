"use strict";

(() => {
  let c=null;

  function configure(context) {
    c=context||null;
    return api;
  }

  function addSegment(array,a,b,color) {
    array.push(a[0],a[1],b[0],b[1],color[0],color[1],color[2],color[3]);
  }

  function buildRenderCache(excludeIds=null) {
    const {
      state,HIT_GRID,shapeIds,shapeBounds,initRenderer,
      hexToRgba,labelColor,renderVertices,isClosedType
    }=c;

    state.shapeById.clear();
    state.indexById.clear();
    state.shapeGrid.clear();
    state.boundsById.clear();

    initRenderer();

    const segments=[];
    const points=[];
    const ids=shapeIds();
    const shapes=state.data?.shapes||[];

    for (let i=0;i<shapes.length;i++) {
      const id=ids[i], shape=shapes[i];
      state.shapeById.set(id,shape);
      state.indexById.set(id,i);

      const bounds=shapeBounds(shape);
      state.boundsById.set(id,bounds);

      const expand=8;
      const gx0=Math.floor((bounds[0]-expand)/HIT_GRID);
      const gy0=Math.floor((bounds[1]-expand)/HIT_GRID);
      const gx1=Math.floor((bounds[2]+expand)/HIT_GRID);
      const gy1=Math.floor((bounds[3]+expand)/HIT_GRID);

      for (let gy=gy0;gy<=gy1;gy++) {
        for (let gx=gx0;gx<=gx1;gx++) {
          const key=`${gx},${gy}`;
          let bucket=state.shapeGrid.get(key);
          if (!bucket) {
            bucket=[];
            state.shapeGrid.set(key,bucket);
          }
          bucket.push(id);
        }
      }

      if (excludeIds?.has(id)) continue;

      const color=hexToRgba(labelColor(shape.label),.96);
      const vertices=renderVertices(shape);
      const closed=isClosedType(shape.shape_type);

      if (shape.shape_type==="point"&&vertices[0]) {
        points.push(vertices[0][0],vertices[0][1],...color);
        continue;
      }

      for (let j=0;j<vertices.length-1;j++) {
        addSegment(segments,vertices[j],vertices[j+1],color);
      }
      if (closed&&vertices.length>2) {
        addSegment(segments,vertices[vertices.length-1],vertices[0],color);
      }
    }

    if (state.webglReady) {
      state.glRenderer.setGeometry(new Float32Array(segments),new Float32Array(points));
    }
  }

  function buildLabelAtlas() {
    const {
      state,LABEL_FONT_PX,LABEL_ATLAS_W,labelColor,shapeAnchor
    }=c;

    state.labelAtlas=null;
    state.labelInstances=new Float32Array();

    if (!state.data?.shapes?.length) {
      state.glRenderer?.setLabels?.(null,new Float32Array());
      return;
    }

    const keys=new Map();
    const measure=document.createElement("canvas").getContext("2d");
    measure.font=`800 ${LABEL_FONT_PX}px "Segoe UI", "Microsoft YaHei UI", sans-serif`;

    const padding=4,rowHeight=23;
    let x=0,y=0,usedWidth=1;

    for (const shape of state.data.shapes) {
      const label=shape.label;
      const color=labelColor(label);
      const key=`${label}\u0000${color}`;
      if (keys.has(key)) continue;

      const width=Math.max(18,Math.ceil(measure.measureText(label).width+padding*2+5));
      if (x&&x+width>LABEL_ATLAS_W) {
        x=0;
        y+=rowHeight;
      }

      keys.set(key,{label,color,x,y,w:width,h:rowHeight});
      x+=width;
      usedWidth=Math.max(usedWidth,x);
    }

    const atlas=document.createElement("canvas");
    const dpr=Math.min(2.5,Math.max(1.5,window.devicePixelRatio||1));
    atlas.width=Math.ceil(usedWidth*dpr);
    atlas.height=Math.ceil(Math.max(rowHeight,y+rowHeight)*dpr);

    const ctx=atlas.getContext("2d");
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.font=`800 ${LABEL_FONT_PX}px "Segoe UI", "Microsoft YaHei UI", sans-serif`;
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.lineJoin="round";
    ctx.lineWidth=3;

    for (const entry of keys.values()) {
      const cx=entry.x+entry.w/2, cy=entry.y+entry.h/2;
      ctx.strokeStyle="rgba(10,12,16,.86)";
      ctx.fillStyle=entry.color;
      ctx.strokeText(entry.label,cx,cy);
      ctx.fillText(entry.label,cx,cy);
    }

    const data=new Float32Array(state.data.shapes.length*8);
    let offset=0;
    for (const shape of state.data.shapes) {
      const entry=keys.get(`${shape.label}\u0000${labelColor(shape.label)}`);
      const anchor=shapeAnchor(shape);
      data[offset++]=anchor[0];
      data[offset++]=anchor[1];
      data[offset++]=(entry.x*dpr)/atlas.width;
      data[offset++]=(entry.y*dpr)/atlas.height;
      data[offset++]=((entry.x+entry.w)*dpr)/atlas.width;
      data[offset++]=((entry.y+entry.h)*dpr)/atlas.height;
      data[offset++]=entry.w;
      data[offset++]=entry.h;
    }

    state.labelAtlas=atlas;
    state.labelInstances=data;
    if (state.webglReady) state.glRenderer.setLabels(atlas,data);
  }

  function shouldWebglShowLabels() {
    const {state,els}=c;
    if (!els.showLabelsCheck.checked) return false;
    const mode=els.labelDisplayMode.value;
    if (mode==="selected") return false;
    if (mode==="all") return true;
    return (state.data?.shapes?.length||0)<=180||state.scale>=.65;
  }

  const api={configure,buildRenderCache,buildLabelAtlas,shouldWebglShowLabels};
  window.HelloLabelRenderCache=api;
})();
