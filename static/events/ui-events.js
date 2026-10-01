"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function bind() {
    const {
      state,els,requestFolder,togglePanel,toggleAppMenu,runMenuCommand,closeAppMenu,
      MODE_BUTTONS,setMode,deleteSelected,undo,redo,saveJsonToFolder,setSaveState,t,setStatus,
      deleteCurrentJson,fitToWindow,actualSize,zoomAt,scheduleViewportRender,cycleTheme,
      applyAiToolbarVisibility,applyLanguage,renderFileList,addLabel,scheduleInstanceListRender,
      selectId,flashSelected,applyImageDisplay,resetDisplay,acceptSam,cancelSam,runSamPrediction,
      resetSamState,updateYoloUi,runYolo,showModelStatus,closeModal
    }=c;

    els.openFolderBtn.addEventListener("click",requestFolder);
    els.leftSidebarToggle?.addEventListener("click",()=>togglePanel("left"));
    els.rightSidebarToggle?.addEventListener("click",()=>togglePanel("right"));

    els.appMenuBtn?.addEventListener("click",event=>{
      event.stopPropagation();
      toggleAppMenu();
    });

    els.appMenu?.addEventListener("click",event=>{
      const command=event.target.closest("[data-command]")?.dataset.command;
      if(command){
        event.stopPropagation();
        runMenuCommand(command);
        return;
      }

      const root=event.target.closest(".menu-root");
      if(root){
        const entry=root.closest(".menu-entry");
        els.appMenu.querySelectorAll(".menu-entry.open").forEach(item=>{
          if(item!==entry)item.classList.remove("open");
        });
        entry?.classList.toggle("open");
        event.stopPropagation();
      }
    });

    document.addEventListener("pointerdown",event=>{
      if(!els.appMenu?.classList.contains("hidden")
          &&!els.appMenu.contains(event.target)
          &&event.target!==els.appMenuBtn){
        closeAppMenu();
      }
    });

    window.HelloLabelEvents.init({buttons:MODE_BUTTONS,setMode});

    els.deleteBtn.addEventListener("click",deleteSelected);
    els.undoBtn.addEventListener("click",undo);
    els.redoBtn.addEventListener("click",redo);
    els.saveBtn.addEventListener("click",()=>{
      saveJsonToFolder(true).catch(error=>{
        setSaveState(t("saveFailed"),"error");
        setStatus(error.message,true);
      });
    });
    els.deleteJsonBtn?.addEventListener("click",deleteCurrentJson);

    els.fitBtn.addEventListener("click",fitToWindow);
    els.actualBtn.addEventListener("click",actualSize);
    els.zoomOutBtn.addEventListener("click",()=>zoomAt(.8));
    els.zoomInBtn.addEventListener("click",()=>zoomAt(1.25));

    els.showLabelsCheck.addEventListener("change",scheduleViewportRender);
    els.labelDisplayMode.addEventListener("change",scheduleViewportRender);
    els.themeBtn.addEventListener("click",cycleTheme);

    els.aiToolbarToggle.addEventListener("change",()=>{
      applyAiToolbarVisibility(els.aiToolbarToggle.checked);
    });
    els.languageSelect.addEventListener("click",()=>{
      applyLanguage(state.language==="zh"?"en":"zh");
    });

    els.fileFilterInput.addEventListener("input",()=>{
      state.fileFilter=els.fileFilterInput.value;
      renderFileList();
    });
    els.clearFileFilterBtn.addEventListener("click",()=>{
      state.fileFilter="";
      els.fileFilterInput.value="";
      renderFileList();
      els.fileFilterInput.focus();
    });

    els.addLabelBtn.addEventListener("click",()=>{
      if(state.data)void addLabel();
    });

    els.instanceList.addEventListener("scroll",scheduleInstanceListRender,{passive:true});
    els.instanceListInner.addEventListener("click",event=>{
      const row=event.target.closest("[data-shape-id]");
      if(!row)return;
      setMode("pointer");
      selectId(row.dataset.shapeId,{scroll:false,ensure:true});
      flashSelected();
    });

    els.brightnessSlider.addEventListener("input",()=>{
      state.brightness=Number(els.brightnessSlider.value);
      applyImageDisplay();
    });
    els.contrastSlider.addEventListener("input",()=>{
      state.contrast=Number(els.contrastSlider.value);
      applyImageDisplay();
    });
    els.resetDisplayBtn.addEventListener("click",resetDisplay);

    els.samAcceptBtn.addEventListener("click",acceptSam);
    els.samCancelBtn.addEventListener("click",()=>cancelSam());
    els.samOutputSelect.addEventListener("change",()=>{
      if(state.mode==="sam"&&(state.sam.points.length||state.sam.box))runSamPrediction();
    });
    els.samModelSelect.addEventListener("change",()=>{
      if(state.mode==="sam")resetSamState();
    });

    els.yoloModelSelect.addEventListener("change",updateYoloUi);
    els.yoloRunBtn.addEventListener("click",runYolo);
    els.modelStatusBtn.addEventListener("click",showModelStatus);

    els.modalBackdrop.addEventListener("pointerdown",event=>{
      if(event.target===els.modalBackdrop)closeModal(null);
    });
  }

  const api={configure,bind};
  window.HelloLabelUiEvents=api;
})();
