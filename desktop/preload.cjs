const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helloLabelDesktop', {
  isDesktop: true,
  platform: process.platform,
  quit: () => ipcRenderer.invoke('hellolabel:quit'),
  installAI: () => ipcRenderer.invoke('hellolabel:install-ai'),
  runtimeInfo: () => ipcRenderer.invoke('hellolabel:runtime-info')
});

// Electron can leave keyboard focus associated with the startup splash after the
// splash is destroyed, especially on Windows. Mouse buttons still work in that
// state, but native text controls may not receive a caret/keyboard input. Keep
// editable controls explicitly outside any draggable region and repair focus only
// when the browser's normal click-to-focus did not succeed.
window.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    input, textarea, select, [contenteditable="true"] {
      -webkit-app-region: no-drag !important;
    }
    input[type="text"], input[type="search"], input[type="number"],
    input:not([type]), textarea, [contenteditable="true"] {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
  `;
  document.head.appendChild(style);

  const editableFromEvent = event => {
    const target = event.target;
    if (!(target instanceof Element)) return null;
    const editable = target.closest('input, textarea, select, [contenteditable="true"]');
    if (!editable || editable.disabled || editable.getAttribute('aria-disabled') === 'true') return null;
    return editable;
  };

  document.addEventListener('pointerdown', event => {
    if (!editableFromEvent(event)) return;
    // Bring the Electron renderer back to the foreground before Chromium performs
    // its native input-focus handling for this pointer event.
    try { window.focus(); } catch {}
  }, true);

  document.addEventListener('click', event => {
    const editable = editableFromEvent(event);
    if (!editable || document.activeElement === editable) return;
    try {
      window.focus();
      editable.focus({ preventScroll: true });
    } catch {}
  }, true);

  // Also restore renderer focus after the splash hand-off and when returning to
  // the application from another window.
  try { window.focus(); } catch {}
  window.addEventListener('pageshow', () => {
    try { window.focus(); } catch {}
  });
});
