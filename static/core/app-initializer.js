"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function init() {
    const {
      state,currentPanelVisible,updatePanelToggleUi,applyAiToolbarVisibility,
      currentAiToolbarVisible,applyLanguage,currentLanguage,initRenderer,
      applyImageDisplay,updateYoloUi,updateActionButtons,setStatus,t
    }=c;

    state.leftPanelVisible=currentPanelVisible("left");
    state.rightPanelVisible=currentPanelVisible("right");
    updatePanelToggleUi();
    applyAiToolbarVisibility(currentAiToolbarVisible(),false);
    applyLanguage(currentLanguage(),false);
    initRenderer();
    applyImageDisplay();
    updateYoloUi();
    updateActionButtons();

    if(!window.showDirectoryPicker){
      setStatus(t("fileAccessNeeded"),true);
    }
  }

  const api={configure,init};
  window.HelloLabelAppInitializer=api;
})();
