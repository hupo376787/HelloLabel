"use strict";

(() => {
  let c=null;

  function configure(context) {
    c=context||null;
    return api;
  }

  function shapeScreenPath(shape) {
    const {state,imageToViewport,circleInfo,renderVertices,isClosedType}=c;
    if (!shape) return "";

    if (shape.shape_type==="circle") {
      const {cx,cy,r}=circleInfo(shape);
      const center=imageToViewport(cx,cy);
      const radius=r*state.scale;
      return `M ${center[0]+radius} ${center[1]} A ${radius} ${radius} 0 1 0 ${center[0]-radius} ${center[1]} A ${radius} ${radius} 0 1 0 ${center[0]+radius} ${center[1]}`;
    }

    if (shape.shape_type==="point") {
      const point=imageToViewport(...shape.points[0]);
      const radius=6;
      return `M ${point[0]+radius} ${point[1]} A ${radius} ${radius} 0 1 0 ${point[0]-radius} ${point[1]} A ${radius} ${radius} 0 1 0 ${point[0]+radius} ${point[1]}`;
    }

    const vertices=renderVertices(shape);
    if (!vertices.length) return "";

    const first=imageToViewport(...vertices[0]);
    let path=`M ${first[0]} ${first[1]}`;
    for (let i=1;i<vertices.length;i++) {
      const point=imageToViewport(...vertices[i]);
      path+=` L ${point[0]} ${point[1]}`;
    }
    if (isClosedType(shape.shape_type)) path+=" Z";
    return path;
  }

  function renderSelectedOverlay() {
    const {
      state,els,primaryShape,isClosedType,controlPointsForShape,
      imageToViewport,shouldWebglShowLabels,shapeAnchor,labelColor
    }=c;

    const shape=primaryShape();
    els.controlHandles.replaceChildren();

    if (!shape) {
      els.selectedPath.classList.add("hidden-svg");
      els.selectedLabelText.classList.add("hidden-svg");
      return;
    }

    els.selectedPath.setAttribute("d",shapeScreenPath(shape));
    els.selectedPath.style.fill=isClosedType(shape.shape_type)?"":"none";
    els.selectedPath.classList.remove("hidden-svg");

    if (state.mode==="pointer") {
      for (const handle of controlPointsForShape(shape)) {
        const point=imageToViewport(...handle.p);
        const circle=document.createElementNS("http://www.w3.org/2000/svg","circle");
        circle.setAttribute("cx",point[0]);
        circle.setAttribute("cy",point[1]);
        circle.setAttribute("r",5);
        circle.classList.add("control-handle");
        if (state.activeHandle&&state.activeHandle.index===handle.index) circle.classList.add("active");
        circle.dataset.handleIndex=String(handle.index);
        circle.dataset.handleKind=handle.kind;
        circle.dataset.shapeId=state.primaryId;
        els.controlHandles.appendChild(circle);
      }
    }

    const mode=els.labelDisplayMode.value;
    const showSelected=els.showLabelsCheck.checked
      && (mode==="selected" || (mode==="smart"&&!shouldWebglShowLabels()));

    if (showSelected) {
      const anchor=imageToViewport(...shapeAnchor(shape));
      els.selectedLabelText.textContent=shape.label;
      els.selectedLabelText.setAttribute("x",anchor[0]+7);
      els.selectedLabelText.setAttribute("y",anchor[1]-7);
      els.selectedLabelText.setAttribute("fill",labelColor(shape.label));
      els.selectedLabelText.classList.remove("hidden-svg");
    } else {
      els.selectedLabelText.classList.add("hidden-svg");
    }
  }

  function flashSelected() {
    const {state,els}=c;
    if (!state.primaryId) return;
    const element=els.selectedPath;
    element.classList.remove("flash-3x");
    void element.getBoundingClientRect();
    element.classList.add("flash-3x");
  }

  const api={configure,shapeScreenPath,renderSelectedOverlay,flashSelected};
  window.HelloLabelSelectionOverlay=api;
})();
