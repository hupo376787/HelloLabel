"use strict";

(() => {
  const listInner = document.getElementById("instanceListInner");
  if (!listInner) return;

  const style = document.createElement("style");
  style.textContent = `
    .instance-row {
      grid-template-columns: 48px minmax(0,1fr) 88px 30px;
      gap: 4px;
      padding-right: 5px;
    }
    .instance-delete-btn {
      width: 26px;
      height: 26px;
      min-width: 26px;
      padding: 0;
      border: 0;
      border-radius: 7px;
      display: grid;
      place-items: center;
      justify-self: end;
      background: transparent;
      color: var(--muted);
      box-shadow: none;
      cursor: pointer;
    }
    .instance-delete-btn:hover:not(:disabled) {
      background: color-mix(in srgb,var(--danger) 12%,transparent);
      color: var(--danger);
      border-color: transparent;
      transform: none;
    }
    .instance-delete-btn:focus-visible {
      outline: 2px solid color-mix(in srgb,var(--danger) 70%,transparent);
      outline-offset: 1px;
    }
    .instance-delete-btn svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
      pointer-events: none;
    }
  `;
  document.head.appendChild(style);

  function deleteIconSvg() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.8h6V7M7.5 7l.8 12h7.4l.8-12M10 10.5v5.5M14 10.5v5.5"/></svg>';
  }

  function decorateRows() {
    for (const row of listInner.querySelectorAll(".instance-row[data-shape-id]")) {
      if (row.querySelector(".instance-delete-btn")) continue;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "instance-delete-btn";
      button.dataset.deleteShapeId = row.dataset.shapeId;
      const label = typeof t === "function" ? t("delete") : "Delete";
      button.title = label;
      button.setAttribute("aria-label", label);
      button.innerHTML = deleteIconSvg();
      row.appendChild(button);
    }
  }

  function deleteInstanceById(id) {
    if (!id || !state?.data) return;
    const index = state.runtimeIds.indexOf(id);
    if (index < 0 || !state.data.shapes?.[index]) return;

    pushHistory();
    state.data.shapes.splice(index, 1);
    state.runtimeIds.splice(index, 1);
    delete state.runtimeMeta[id];

    state.selectedIds.delete(id);
    if (state.primaryId === id) {
      state.primaryId = [...state.selectedIds].at(-1) || null;
    }
    state.activeHandle = null;

    markDirty(t("instancesDeleted", { count: 1 }));
    renderAll();
  }

  listInner.addEventListener("click", event => {
    const button = event.target.closest?.(".instance-delete-btn[data-delete-shape-id]");
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    deleteInstanceById(button.dataset.deleteShapeId);
  }, true);

  new MutationObserver(decorateRows).observe(listInner, { childList: true, subtree: true });
  decorateRows();
})();
