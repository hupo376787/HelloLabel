const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helloLabelDesktop', {
  isDesktop: true,
  platform: process.platform,
  quit: () => ipcRenderer.invoke('hellolabel:quit'),
  installAI: () => ipcRenderer.invoke('hellolabel:install-ai'),
  runtimeInfo: () => ipcRenderer.invoke('hellolabel:runtime-info')
});

// Windows can finish activating the Electron BrowserWindow a few milliseconds
// after the renderer has already processed the click. If an input is focused too
// early, the later native-window activation can put focus back on <body>, which
// looks like a completely dead text box. Repair the editable focus *after* the
// activation/click sequence instead of trying to force window.focus() synchronously.
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    input, textarea, select, [contenteditable="true"] {
      -webkit-app-region: no-drag !important;
      pointer-events: auto !important;
    }
    input[type="text"], input[type="search"], input[type="number"],
    input:not([type]), textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  let pendingEditable = null;
  let focusSequence = 0;

  const editableFromTarget = target => {
    if (!(target instanceof Element)) return null;
    const editable = target.closest('input, textarea, select, [contenteditable="true"]');
    if (!editable || editable.disabled || editable.getAttribute('aria-disabled') === 'true') return null;
    return editable;
  };

  const focusEditable = editable => {
    if (!editable || !editable.isConnected || editable.disabled) return false;
    try {
      editable.focus({ preventScroll: true });
      return document.activeElement === editable;
    } catch {
      return false;
    }
  };

  const scheduleFocusRepair = editable => {
    if (!editable) return;
    pendingEditable = editable;
    const seq = ++focusSequence;

    // Run after Chromium's normal click focus, then once more after the native
    // Windows activation/focus hand-off has settled. The second pass is important
    // when the main window was shown immediately after the startup splash.
    setTimeout(() => {
      if (seq !== focusSequence || !pendingEditable?.isConnected) return;
      focusEditable(pendingEditable);
    }, 0);
    setTimeout(() => {
      if (seq !== focusSequence || !pendingEditable?.isConnected) return;
      focusEditable(pendingEditable);
    }, 80);
  };

  document.addEventListener('pointerdown', event => {
    const editable = editableFromTarget(event.target);
    if (editable) scheduleFocusRepair(editable);
  }, true);

  document.addEventListener('mousedown', event => {
    const editable = editableFromTarget(event.target);
    if (editable) scheduleFocusRepair(editable);
  }, true);

  document.addEventListener('click', event => {
    const editable = editableFromTarget(event.target);
    if (editable) scheduleFocusRepair(editable);
  }, true);

  document.addEventListener('focusin', event => {
    const editable = editableFromTarget(event.target);
    if (editable) pendingEditable = editable;
  }, true);

  window.addEventListener('focus', () => {
    if (pendingEditable?.isConnected) scheduleFocusRepair(pendingEditable);
  });

  window.addEventListener('pageshow', () => {
    if (pendingEditable?.isConnected) scheduleFocusRepair(pendingEditable);
  });
});
