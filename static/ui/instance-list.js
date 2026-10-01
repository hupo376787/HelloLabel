"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function rebuildInstanceList() {
    const {state,els,shapeIds,INSTANCE_ROW_H}=c;
    state.instanceIds=[...shapeIds()];
    els.instanceCount.textContent=String(state.instanceIds.length);
    els.instanceListInner.style.height=`${state.instanceIds.length*INSTANCE_ROW_H}px`;
    scheduleInstanceListRender();
  }

  function scheduleInstanceListRender() {
    const {state}=c;
    if(state.instanceListRaf)return;
    state.instanceListRaf=requestAnimationFrame(()=>{
      state.instanceListRaf=0;
      renderInstanceListWindow();
    });
  }

  function renderInstanceListWindow() {
    const {
      state,els,INSTANCE_ROW_H,INSTANCE_OVERSCAN,
      shapeAtId,escapeHtml,shapeTypeText
    }=c;

    const count=state.instanceIds.length;
    const viewHeight=els.instanceList.clientHeight||300;
    const scroll=els.instanceList.scrollTop||0;
    const start=Math.max(0,Math.floor(scroll/INSTANCE_ROW_H)-INSTANCE_OVERSCAN);
    const end=Math.min(
      count,
      Math.ceil((scroll+viewHeight)/INSTANCE_ROW_H)+INSTANCE_OVERSCAN
    );

    const fragment=document.createDocumentFragment();

    for(let i=start;i<end;i++){
      const id=state.instanceIds[i];
      const shape=shapeAtId(id);
      if(!shape)continue;

      const row=document.createElement("div");
      row.className="instance-row"+(state.selectedIds.has(id)?" active":"");
      row.style.top=`${i*INSTANCE_ROW_H}px`;
      row.dataset.shapeId=id;
      row.innerHTML=`<span class="instance-no">#${i+1}</span><span class="instance-label" title="${escapeHtml(shape.label)}">${escapeHtml(shape.label)}</span><span class="shape-chip">${escapeHtml(shapeTypeText(shape.shape_type))}</span>`;
      fragment.appendChild(row);
    }

    els.instanceListInner.replaceChildren(fragment);
  }

  function scrollInstanceToId(id) {
    const {state,els,INSTANCE_ROW_H}=c;
    const index=state.instanceIds.indexOf(id);
    if(index<0)return;

    const top=index*INSTANCE_ROW_H;
    const bottom=top+INSTANCE_ROW_H;
    const scrollTop=els.instanceList.scrollTop;
    const viewHeight=els.instanceList.clientHeight;

    if(top<scrollTop)els.instanceList.scrollTop=top;
    else if(bottom>scrollTop+viewHeight){
      els.instanceList.scrollTop=Math.max(0,bottom-viewHeight);
    }

    scheduleInstanceListRender();
  }

  const api={
    configure,
    rebuildInstanceList,
    scheduleInstanceListRender,
    renderInstanceListWindow,
    scrollInstanceToId
  };

  window.HelloLabelInstances=api;
})();
