"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  function applyImageDisplay() {
    const { state, els } = c;
    const brightness = Math.max(0, (100 + Number(state.brightness)) / 100);
    const contrast = Number(state.contrast) / 100;
    els.imageView.style.filter = `brightness(${brightness}) contrast(${contrast})`;
    els.brightnessValue.textContent = String(state.brightness);
    els.contrastValue.textContent = contrast.toFixed(2);
  }

  function resetDisplay() {
    const { state, els } = c;
    state.brightness = 0;
    state.contrast = 100;
    els.brightnessSlider.value = "0";
    els.contrastSlider.value = "100";
    applyImageDisplay();
  }

  function fitToWindow() {
    const { state, els, clamp, scheduleViewportRender } = c;
    if (!state.data) return;
    const rect = els.viewport.getBoundingClientRect();
    const padding = 20;
    const scale = Math.min(
      (rect.width-padding*2) / Math.max(1,state.width),
      (rect.height-padding*2) / Math.max(1,state.height)
    );
    state.scale = clamp(scale, .02, 40);
    state.panX = (rect.width-state.width*state.scale) / 2;
    state.panY = (rect.height-state.height*state.scale) / 2;
    scheduleViewportRender();
  }

  function actualSize() {
    const { state, els, scheduleViewportRender } = c;
    if (!state.data) return;
    const rect = els.viewport.getBoundingClientRect();
    state.scale = 1;
    state.panX = (rect.width-state.width) / 2;
    state.panY = (rect.height-state.height) / 2;
    scheduleViewportRender();
  }

  function zoomAt(factor, clientX = null, clientY = null) {
    const { state, els, clamp, scheduleViewportRender } = c;
    if (!state.data) return;

    const rect = els.viewport.getBoundingClientRect();
    const cx = clientX == null ? rect.left+rect.width/2 : clientX;
    const cy = clientY == null ? rect.top+rect.height/2 : clientY;
    const imageX = (cx-rect.left-state.panX) / state.scale;
    const imageY = (cy-rect.top-state.panY) / state.scale;
    const next = clamp(state.scale*factor, .02, 80);

    state.panX = (cx-rect.left) - imageX*next;
    state.panY = (cy-rect.top) - imageY*next;
    state.scale = next;
    scheduleViewportRender();
  }

  function startPan(event) {
    const { state, els } = c;
    if (!(event.button === 1 || (state.spaceDown && event.button === 0))) return false;

    state.panning = true;
    state.panStart = {
      x:event.clientX,
      y:event.clientY,
      panX:state.panX,
      panY:state.panY,
      pointerId:event.pointerId
    };

    els.viewport.classList.add("panning");
    window.helloLabelPointerInput?.capture?.(event)
      ?? (els.viewport.setPointerCapture?.(event.pointerId), true);
    event.preventDefault();
    return true;
  }

  function movePan(event) {
    const { state, scheduleViewportRender } = c;
    if (!state.panning) return false;
    state.panX = state.panStart.panX + (event.clientX-state.panStart.x);
    state.panY = state.panStart.panY + (event.clientY-state.panStart.y);
    scheduleViewportRender();
    return true;
  }

  function endPan() {
    const { state, els } = c;
    if (!state.panning) return false;

    const pointerId = state.panStart?.pointerId;
    state.panning = false;
    state.panStart = null;
    els.viewport.classList.remove("panning");
    window.helloLabelPointerInput?.release?.(pointerId);
    return true;
  }

  const api = {
    configure,
    applyImageDisplay,
    resetDisplay,
    fitToWindow,
    actualSize,
    zoomAt,
    startPan,
    movePan,
    endPan
  };

  window.HelloLabelViewport = api;
})();
