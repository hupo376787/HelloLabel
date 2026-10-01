"use strict";

(() => {
  let current = null;

  function create({ language = "zh" } = {}) {
    const state = {
      dirHandle:null, entries:[], fileFilter:"", imageHandle:null, imageFile:null, imageName:"", jsonHandle:null, data:null,
      width:0,height:0,previewUrl:null,previewBlob:null,aiImageToken:null,
      selectedIds:new Set(), primaryId:null, activeHandle:null, activeLabel:null,
      mode:"pointer", dirty:false, revision:0, savedRevision:0, history:[], future:[], saveTimer:0, saveInFlight:false, saveQueued:false, savePromise:null,
      scale:1,panX:0,panY:0,panning:false,panStart:null,spaceDown:false,transformRaf:0,
      drawing:null, editing:null,
      shapeById:new Map(), indexById:new Map(), shapeGrid:new Map(), boundsById:new Map(), runtimeIds:[], runtimeMeta:{},
      glRenderer:null,webglReady:false,labelAtlas:null,labelInstances:null,
      instanceIds:[],instanceListRaf:0,
      brightness:0,contrast:100,
      sam:{points:[],labels:[],box:null,history:[],preview:null,drag:null,requestSeq:0},
      modalResolve:null, language, aiToolbarVisible:true, leftPanelVisible:true, rightPanelVisible:true, aiInstallerLaunching:false,
    };

    current = state;
    // Compatibility bridge for modules that need the shared application state.
    window.helloLabelState = state;
    return state;
  }

  function get() {
    return current;
  }

  window.HelloLabelState = {
    create,
    get
  };
})();
