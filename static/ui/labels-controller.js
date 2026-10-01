"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function labelUsage() {
    const usage=new Map();
    for(const shape of c.state.data?.shapes||[]){
      usage.set(shape.label,(usage.get(shape.label)||0)+1);
    }
    return usage;
  }

  function renderLabelList() {
    const {state,els,t}=c;

    if(!state.data){
      els.labelList.replaceChildren();
      els.labelCount.textContent="0";
      return;
    }

    const labels=state.data.hellolabel.labels;
    const usage=labelUsage();

    els.labelList.replaceChildren();
    const names=Object.keys(labels);
    els.labelCount.textContent=String(names.length);

    for(const name of names){
      const row=document.createElement("div");
      row.className="label-row"+(state.activeLabel===name?" active":"");
      row.dataset.label=name;

      const color=document.createElement("input");
      color.type="color";
      color.className="label-color";
      color.value=labels[name].color;
      color.title=t("changeLabelColor");
      color.addEventListener("click",event=>event.stopPropagation());
      color.addEventListener("change",event=>{
        event.stopPropagation();
        changeLabelColor(name,color.value);
      });

      const text=document.createElement("div");
      text.className="label-name";
      text.textContent=name;
      text.title=name;

      const count=document.createElement("div");
      count.className="label-count";
      count.textContent=String(usage.get(name)||0);

      const rename=document.createElement("button");
      rename.className="icon-btn";
      rename.title=t("rename");
      rename.textContent="✎";
      rename.addEventListener("click",event=>{
        event.stopPropagation();
        void renameLabel(name);
      });

      const remove=document.createElement("button");
      remove.className="icon-btn danger";
      remove.title=t("deleteLabel");
      remove.textContent="×";
      remove.addEventListener("click",event=>{
        event.stopPropagation();
        void deleteLabel(name);
      });

      row.append(color,text,count,rename,remove);
      row.addEventListener("click",()=>{
        state.activeLabel=name;
        renderLabelList();
        c.setStatus(t("currentDrawLabel",{name}));
      });

      els.labelList.appendChild(row);
    }
  }

  function changeLabelColor(name,color) {
    const {
      state,pushHistory,markDirty,t,buildRenderCache,
      buildLabelAtlas,renderSelectedOverlay,scheduleViewportRender
    }=c;

    if(!state.data?.hellolabel?.labels?.[name])return;
    pushHistory();
    state.data.hellolabel.labels[name].color=color;
    markDirty(t("labelColorChanged",{name}));
    buildRenderCache();
    buildLabelAtlas();
    renderSelectedOverlay();
    scheduleViewportRender();
  }

  async function resolveNewShapeLabel() {
    const {state,chooseLabelModal}=c;
    if(state.activeLabel&&state.data?.hellolabel?.labels?.[state.activeLabel]){
      return state.activeLabel;
    }
    return chooseLabelModal();
  }

  async function addLabel() {
    const {state,promptText,t,pushHistory,stableColor,markDirty}=c;
    const name=await promptText(t("addLabel"),t("enterNewLabel"),"");
    if(!name)return;

    if(state.data.hellolabel.labels[name]){
      state.activeLabel=name;
      renderLabelList();
      return;
    }

    pushHistory();
    state.data.hellolabel.labels[name]={color:stableColor(name)};
    state.activeLabel=name;
    markDirty(t("labelAdded",{name}));
    renderLabelList();
  }

  async function renameLabel(oldName) {
    const {
      state,promptText,t,escapeHtml,confirmModal,pushHistory,
      stableColor,markDirty,renderAll
    }=c;

    const count=labelUsage().get(oldName)||0;
    const newName=await promptText(t("renameLabel"),t("renameSyncHint",{count}),oldName);
    if(!newName||newName===oldName)return;

    const exists=!!state.data.hellolabel.labels[newName];
    const message=exists
      ? t("renameExistingMsg",{newName:escapeHtml(newName),oldName:escapeHtml(oldName),count})
      : t("renameMsg",{oldName:escapeHtml(oldName),newName:escapeHtml(newName),count});

    if(!await confirmModal(t("confirmRename"),message,exists?t("mergeRename"):t("renameAction")))return;

    pushHistory();
    const oldColor=state.data.hellolabel.labels[oldName]?.color||stableColor(oldName);
    if(!exists)state.data.hellolabel.labels[newName]={color:oldColor};
    delete state.data.hellolabel.labels[oldName];

    for(const shape of state.data.shapes){
      if(shape.label===oldName)shape.label=newName;
    }

    if(state.activeLabel===oldName)state.activeLabel=newName;
    markDirty(t("renameSynced"));
    renderAll();
  }

  async function deleteLabel(name) {
    const {
      state,t,escapeHtml,confirmModal,pushHistory,markDirty,showModal,$,
      shapeIds,stableColor,clearSelection,renderAll
    }=c;

    const usage=labelUsage();
    const count=usage.get(name)||0;

    if(count===0){
      const ok=await confirmModal(
        t("deleteLabel"),
        t("deleteLabelConfirm",{name:escapeHtml(name)}),
        t("deleteAction"),
        true
      );
      if(!ok)return;

      pushHistory();
      delete state.data.hellolabel.labels[name];
      if(state.activeLabel===name)state.activeLabel=null;
      markDirty(t("labelDeleted",{name}));
      renderLabelList();
      return;
    }

    const alternatives=Object.keys(state.data.hellolabel.labels).filter(item=>item!==name);
    const body=`<div class="danger-note">${t("labelInUse",{name:escapeHtml(name),count})}</div><label>${escapeHtml(t("replacementLabel"))}<select id="replacementLabel"><option value="">${escapeHtml(t("choosePlaceholder"))}</option>${alternatives.map(item=>`<option value="${escapeHtml(item)}">${escapeHtml(item)}</option>`).join("")}</select></label><label style="display:block;margin-top:10px">${escapeHtml(t("newReplacement"))}<input id="replacementNew" type="text" placeholder="${escapeHtml(t("newLabelName"))}" /></label><label style="display:flex;gap:7px;align-items:center;margin-top:12px;color:var(--danger)"><input id="deleteAssociated" type="checkbox" /> ${escapeHtml(t("deleteAssociated",{count}))}</label>`;

    const result=await showModal({
      title:t("deleteLabel"),
      body,
      buttons:[
        {label:t("cancel"),value:null},
        {label:t("execute"),value:"ok",className:"primary"}
      ]
    });
    if(result!=="ok")return;

    const remove=!!$("deleteAssociated")?.checked;
    let replacement=String($("replacementNew")?.value||"").trim()
      ||String($("replacementLabel")?.value||"");

    if(!remove&&!replacement){
      alert(t("chooseReplacement"));
      return;
    }

    pushHistory();

    if(remove){
      const oldIds=[...shapeIds()];
      for(let i=state.data.shapes.length-1;i>=0;i--){
        if(state.data.shapes[i].label===name){
          const id=oldIds[i];
          state.data.shapes.splice(i,1);
          state.runtimeIds.splice(i,1);
          delete state.runtimeMeta[id];
        }
      }
    }else{
      if(!state.data.hellolabel.labels[replacement]){
        state.data.hellolabel.labels[replacement]={color:stableColor(replacement)};
      }
      for(const shape of state.data.shapes){
        if(shape.label===name)shape.label=replacement;
      }
    }

    delete state.data.hellolabel.labels[name];
    if(state.activeLabel===name)state.activeLabel=remove?null:replacement;

    clearSelection();
    markDirty(
      remove
        ? t("labelAndInstancesDeleted",{name,count})
        : t("instancesReplaced",{count,replacement})
    );
    renderAll();
  }

  const api={
    configure,
    labelUsage,
    renderLabelList,
    changeLabelColor,
    resolveNewShapeLabel,
    addLabel,
    renameLabel,
    deleteLabel
  };

  window.HelloLabelLabels=api;
})();
