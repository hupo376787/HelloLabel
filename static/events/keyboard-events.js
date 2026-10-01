"use strict";

(() => {
  let c=null;
  function configure(context){c=context||null;return api;}

  function bind() {
    const {
      state,els,closeModal,cancelSam,cancelDrawing,acceptSam,orientedRectFromEdge,
      finishSequenceDrawing,samUndoPrompt,deleteSelected,saveJsonToFolder,setSaveState,
      t,setStatus,requestFolder,undo,redo,setMode,currentTheme,applyTheme
    }=c;

    window.addEventListener("keydown",event=>{
      const modalOpen=!els.modalBackdrop.classList.contains("hidden");
      if(modalOpen){
        if(event.key==="Escape"){
          event.preventDefault();
          closeModal(null);
        }else if(event.key==="Enter"&&!event.shiftKey){
          const primary=[...els.modalActions.querySelectorAll("button")].at(-1);
          if(primary){
            event.preventDefault();
            primary.click();
          }
        }
        return;
      }

      const editable=event.target instanceof HTMLInputElement
        ||event.target instanceof HTMLSelectElement
        ||event.target instanceof HTMLTextAreaElement;

      if(event.code==="Space"&&!editable){
        state.spaceDown=true;
        event.preventDefault();
      }

      if(event.key==="Escape"){
        if(state.mode==="sam"){
          cancelSam();
          event.preventDefault();
          return;
        }
        if(state.drawing){
          cancelDrawing();
          event.preventDefault();
          return;
        }
      }

      if(event.key==="Enter"&&!editable){
        if(state.mode==="sam"&&state.sam.preview){
          acceptSam();
          event.preventDefault();
          return;
        }

        if(state.drawing){
          const drawing=state.drawing;
          if(
            drawing.type==="oriented_rectangle"
            &&drawing.points.length===2
            &&drawing.cursor
          ){
            drawing.points=orientedRectFromEdge(
              drawing.points[0],
              drawing.points[1],
              drawing.cursor
            );
          }
          finishSequenceDrawing();
          event.preventDefault();
          return;
        }
      }

      if(state.mode==="sam"&&event.key==="Backspace"&&!editable){
        event.preventDefault();
        samUndoPrompt();
        return;
      }

      if(
        (event.key==="Delete"||event.key==="Backspace")
        &&state.mode==="pointer"
        &&state.primaryId
        &&!editable
      ){
        event.preventDefault();
        deleteSelected();
        return;
      }

      if((event.ctrlKey||event.metaKey)&&!editable&&event.key.toLowerCase()==="s"){
        event.preventDefault();
        saveJsonToFolder(true).catch(error=>{
          setSaveState(t("saveFailed"),"error");
          setStatus(error.message,true);
        });
        return;
      }

      if((event.ctrlKey||event.metaKey)&&!editable&&event.key.toLowerCase()==="o"){
        event.preventDefault();
        requestFolder();
        return;
      }

      if((event.ctrlKey||event.metaKey)&&!editable&&event.key.toLowerCase()==="z"){
        event.preventDefault();
        if(event.shiftKey)redo();
        else undo();
        return;
      }

      if((event.ctrlKey||event.metaKey)&&!editable&&event.key.toLowerCase()==="y"){
        event.preventDefault();
        redo();
        return;
      }

      if(editable||event.ctrlKey||event.metaKey||event.altKey)return;

      const key=event.key.toLowerCase();
      const map={
        v:"pointer",
        b:"pen",
        p:"polygon",
        r:"rectangle",
        o:"oriented_rectangle",
        c:"circle",
        d:"point",
        l:"line",
        k:"linestrip"
      };

      if(map[key]){
        setMode(map[key]);
        event.preventDefault();
      }
    });

    window.addEventListener("keyup",event=>{
      if(event.code==="Space")state.spaceDown=false;
    });

    window.addEventListener("beforeunload",event=>{
      if(state.dirty){
        event.preventDefault();
        event.returnValue="";
      }
    });

    matchMedia("(prefers-color-scheme: light)").addEventListener?.("change",()=>{
      if(currentTheme()==="system")applyTheme("system",false);
    });
  }

  const api={configure,bind};
  window.HelloLabelKeyboardEvents=api;
})();
