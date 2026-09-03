const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helloLabelDesktop', {
  isDesktop: true,
  platform: process.platform,
  quit: () => ipcRenderer.invoke('hellolabel:quit'),
  installAI: () => ipcRenderer.invoke('hellolabel:install-ai'),
  runtimeInfo: () => ipcRenderer.invoke('hellolabel:runtime-info')
});

// Keep editable focus entirely inside the renderer. The old recovery logic could
// retain a reference to an input inside a modal after that modal was hidden, then
// focus the invisible control again on the next window-focus event. That made a
// later visible text box look dead even though clicks were reaching the page.
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

  const isVisibleEditable = editable => {
    if (!editable || !editable.isConnected || editable.disabled) return false;
    if (editable.getAttribute('aria-disabled') === 'true') return false;
    if (editable.closest('[aria-hidden="true"]')) return false;
    try {
      return editable.getClientRects().length > 0;
    } catch {
      return false;
    }
  };

  const clearPendingFocus = () => {
    pendingEditable = null;
    focusSequence++;
  };

  const focusEditable = editable => {
    if (!isVisibleEditable(editable)) return false;
    try { window.focus(); } catch {}
    try {
      editable.focus({ preventScroll: true });
    } catch {
      try { editable.focus(); } catch {}
    }
    return document.activeElement === editable;
  };

  const scheduleFocusRepair = editable => {
    if (!isVisibleEditable(editable)) return;
    pendingEditable = editable;
    const seq = ++focusSequence;

    // Repair after normal click handling and again after Windows/Electron has
    // settled its native activation state. Every pass re-checks visibility so a
    // modal input can never be refocused after its backdrop has been hidden.
    for (const delay of [0, 40, 120, 250]) {
      setTimeout(() => {
        if (seq !== focusSequence || pendingEditable !== editable) return;
        if (!isVisibleEditable(editable)) {
          clearPendingFocus();
          return;
        }
        focusEditable(editable);
      }, delay);
    }
  };

  document.addEventListener('pointerdown', event => {
    const editable = editableFromTarget(event.target);
    if (editable) {
      scheduleFocusRepair(editable);
      return;
    }

    // Clicking a button, label row, canvas, modal action, etc. intentionally ends
    // any queued focus repair for the previous text field. This is especially
    // important for OK/Cancel buttons that hide a modal immediately afterwards.
    clearPendingFocus();
  }, true);

  document.addEventListener('focusin', event => {
    const editable = editableFromTarget(event.target);
    if (editable && isVisibleEditable(editable)) pendingEditable = editable;
  }, true);

  document.addEventListener('focusout', () => {
    queueMicrotask(() => {
      if (pendingEditable && !isVisibleEditable(pendingEditable)) clearPendingFocus();
    });
  }, true);

  const restoreVisiblePending = () => {
    if (pendingEditable && isVisibleEditable(pendingEditable)) scheduleFocusRepair(pendingEditable);
    else clearPendingFocus();
  };

  window.addEventListener('focus', restoreVisiblePending);
  window.addEventListener('pageshow', restoreVisiblePending);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) restoreVisiblePending();
  });

  // Watch modal visibility changes so a hidden modal can never keep ownership of
  // keyboard focus through a stale input reference.
  const modalBackdrop = document.getElementById('modalBackdrop');
  if (modalBackdrop && typeof MutationObserver === 'function') {
    const observer = new MutationObserver(() => {
      if (modalBackdrop.classList.contains('hidden') || modalBackdrop.getAttribute('aria-hidden') === 'true') {
        if (pendingEditable?.closest?.('#modalBackdrop')) clearPendingFocus();
      }
    });
    observer.observe(modalBackdrop, { attributes: true, attributeFilter: ['class', 'aria-hidden'] });
  }
});
