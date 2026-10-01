"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function showModal({title,body,buttons}) {
    const {state,els}=c;

    if(state.modalResolve){
      state.modalResolve(null);
      state.modalResolve=null;
    }

    els.modalTitle.textContent=title;
    els.modalBody.innerHTML=body;
    els.modalActions.replaceChildren();
    els.modalBackdrop.classList.remove("hidden");
    els.modalBackdrop.setAttribute("aria-hidden","false");

    return new Promise(resolve=>{
      state.modalResolve=resolve;

      for(const item of buttons){
        const button=document.createElement("button");
        button.textContent=item.label;
        if(item.className)button.className=item.className;
        button.addEventListener("click",()=>closeModal(item.value));
        els.modalActions.appendChild(button);
      }

      requestAnimationFrame(()=>els.modalBody.querySelector("input,select,button")?.focus());
    });
  }

  function closeModal(value=null) {
    const {state,els}=c;
    els.modalBackdrop.classList.add("hidden");
    els.modalBackdrop.setAttribute("aria-hidden","true");

    const resolve=state.modalResolve;
    state.modalResolve=null;
    if(resolve)resolve(value);
  }

  async function promptText(title,message,value="") {
    const {$,escapeHtml,t}=c;
    const result=await showModal({
      title,
      body:`<div>${escapeHtml(message)}</div><input id="modalTextValue" type="text" value="${escapeHtml(value)}" autocomplete="off" />`,
      buttons:[
        {label:t("cancel"),value:null},
        {label:t("ok"),value:"ok",className:"primary"}
      ]
    });

    if(result!=="ok")return null;
    return String($("modalTextValue")?.value||"").trim();
  }

  async function confirmModal(title,message,confirmText=c.t("ok"),danger=false) {
    const {t}=c;
    return (await showModal({
      title,
      body:`<div>${message}</div>`,
      buttons:[
        {label:t("cancel"),value:false},
        {label:confirmText,value:true,className:danger?"danger-button":"primary"}
      ]
    }))===true;
  }

  async function chooseLabelModal() {
    const {state,escapeHtml,t,labelColor,$}=c;
    const labels=Object.keys(state.data?.hellolabel?.labels||{});
    const html=`<div>${escapeHtml(t("chooseOrCreateLabel"))}</div><div id="modalLabelList" class="modal-label-list">${labels.map(name=>`<div class="modal-label-option" data-label="${escapeHtml(name)}"><span class="dot" style="background:${labelColor(name)}"></span><span>${escapeHtml(name)}</span></div>`).join("")||`<div class="muted">${escapeHtml(t("noLabelsYet"))}</div>`}</div><label>${escapeHtml(t("newLabel"))}<input id="modalNewLabel" type="text" placeholder="${escapeHtml(t("newLabelPlaceholder"))}" /></label>`;

    let picked=null;
    const promise=showModal({
      title:t("chooseLabel"),
      body:html,
      buttons:[
        {label:t("cancel"),value:null},
        {label:t("ok"),value:"ok",className:"primary"}
      ]
    });

    requestAnimationFrame(()=>{
      const list=$("modalLabelList");
      const selectRow=row=>{
        if(!row)return;
        picked=row.dataset.label;
        list?.querySelectorAll(".modal-label-option")
          .forEach(item=>item.classList.toggle("active",item===row));
        const input=$("modalNewLabel");
        if(input)input.value="";
      };

      list?.addEventListener("click",event=>selectRow(event.target.closest("[data-label]")));
      list?.addEventListener("dblclick",event=>{
        const row=event.target.closest("[data-label]");
        if(!row)return;
        selectRow(row);
        event.preventDefault();
        closeModal("ok");
      });

      $("modalNewLabel")?.addEventListener("input",()=>{
        picked=null;
        list?.querySelectorAll(".modal-label-option")
          .forEach(item=>item.classList.remove("active"));
      });
    });

    const result=await promise;
    if(result!=="ok")return null;

    const typed=String($("modalNewLabel")?.value||"").trim();
    const label=typed||picked;
    return label||null;
  }

  const api={configure,showModal,closeModal,promptText,confirmModal,chooseLabelModal};
  window.HelloLabelModal=api;
})();
