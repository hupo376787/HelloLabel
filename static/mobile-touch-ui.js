"use strict";

// Touch-screen shell for phones and small tablets.
// It moves the live desktop panels into a single responsive drawer instead of
// cloning their data or event handlers.
(() => {
  function initTouchShell() {
    const viewport = document.getElementById("viewport");
    const workspace = document.querySelector(".workspace-wrap");
    const sidebar = document.getElementById("leftSidebar");
    const inspector = document.getElementById("rightSidebar");
    const aiRow = document.querySelector(".ai-row");
    const appMenu = document.getElementById("appMenu");
    if (!viewport || !workspace || !sidebar || !inspector || !aiRow || !appMenu) return;

    const style = document.createElement("style");
    style.textContent = `
      .hellolabel-touch-launcher,.hellolabel-touch-drawer,.hellolabel-touch-drawer-mask{display:none}
      .hellolabel-touch-drawer[hidden],.hellolabel-touch-drawer-mask[hidden]{display:none!important}

      html.hellolabel-touch-layout .hellolabel-touch-launcher{
        display:flex;position:absolute;top:10px;left:50%;transform:translateX(-50%);
        z-index:65;gap:8px;padding:6px;border:1px solid color-mix(in srgb,var(--line2) 88%,transparent);
        border-radius:16px;background:color-mix(in srgb,var(--panel) 92%,transparent);
        box-shadow:0 10px 28px rgba(0,0,0,.22);backdrop-filter:blur(10px);
        pointer-events:auto;
      }
      html.hellolabel-touch-layout .hellolabel-touch-launcher button{
        min-width:68px;min-height:44px;padding:7px 11px;border-radius:11px;
        touch-action:manipulation;font-weight:650;
      }

      html.hellolabel-touch-layout .app-menu.hellolabel-touch-app-menu{
        position:fixed!important;top:76px!important;right:12px!important;left:auto!important;
        width:min(300px,calc(100vw - 24px))!important;max-height:calc(100dvh - 88px);
        overflow:auto;z-index:112!important;
        border-radius:18px;padding:8px;
      }
      html.hellolabel-touch-layout .hellolabel-touch-app-menu .app-submenu{
        position:static!important;left:auto!important;top:auto!important;width:auto!important;
        margin:4px 0 6px 12px;box-shadow:none!important;backdrop-filter:none!important;
      }

      html.hellolabel-touch-layout .hellolabel-touch-drawer-mask{
        display:block;position:fixed;inset:0;z-index:88;background:rgba(0,0,0,.38);
        backdrop-filter:blur(1px);
      }
      html.hellolabel-touch-layout .hellolabel-touch-drawer{
        display:flex;position:fixed;top:76px;right:12px;bottom:12px;z-index:90;
        width:min(430px,calc(100vw - 24px));flex-direction:column;overflow:hidden;
        border:1px solid var(--line2);border-radius:20px;background:var(--panel);
        box-shadow:0 22px 58px rgba(0,0,0,.34);
      }
      .hellolabel-touch-drawer-header{
        display:flex;align-items:center;justify-content:space-between;gap:12px;
        min-height:56px;padding:8px 10px 8px 16px;border-bottom:1px solid var(--line);
        background:var(--panel2);flex:none;
      }
      .hellolabel-touch-drawer-title{font-size:15px;font-weight:750}
      .hellolabel-touch-drawer-close{width:44px;height:44px;min-width:44px;padding:0;font-size:22px}
      .hellolabel-touch-drawer-content{min-height:0;flex:1;overflow:hidden;display:flex}
      .hellolabel-touch-drawer-content>.sidebar,
      .hellolabel-touch-drawer-content>.inspector{
        display:flex!important;width:100%!important;height:100%!important;max-width:none!important;
        border:0!important;visibility:visible!important;pointer-events:auto!important;
      }
      .hellolabel-touch-drawer-content>.ai-row{
        display:flex!important;width:100%;height:100%;min-width:0;overflow:auto;
        flex-direction:column;align-items:stretch;gap:10px;padding:12px;
        background:var(--panel);border:0;
      }
      .hellolabel-touch-drawer-content>.ai-row .ai-box{
        width:100%;min-width:0;box-sizing:border-box;flex-wrap:wrap;align-items:center;
      }
      .hellolabel-touch-drawer-content>.ai-row .ai-box select,
      .hellolabel-touch-drawer-content>.ai-row .ai-box input{
        max-width:100%;
      }
      .hellolabel-touch-drawer-content>.ai-row .world-text{width:min(100%,220px)}
      .hellolabel-touch-drawer-content>.ai-row .model-status-btn{margin-left:0;min-height:44px}

      .touch-crosshair{
        display:none;position:absolute;width:32px;height:32px;margin:-16px;
        pointer-events:none;z-index:40;
      }
      html.hellolabel-touch-mode .touch-crosshair.active{display:block}
      .touch-crosshair::before,.touch-crosshair::after{
        content:"";position:absolute;background:#fff;box-shadow:0 0 4px #000;
      }
      .touch-crosshair::before{left:15px;top:0;width:2px;height:32px}
      .touch-crosshair::after{left:0;top:15px;width:32px;height:2px}

      @media (max-width:700px){
        html.hellolabel-touch-layout .hellolabel-touch-drawer{
          left:0;right:0;top:auto;bottom:0;width:100%;height:min(76dvh,620px);
          border-radius:24px 24px 0 0;border-left:0;border-right:0;border-bottom:0;
        }
        html.hellolabel-touch-layout .hellolabel-touch-launcher{
          top:8px;gap:5px;padding:5px;
        }
        html.hellolabel-touch-layout .hellolabel-touch-launcher button{
          min-width:60px;padding-inline:8px;
        }
      }
    `;
    document.head.appendChild(style);

    const launcher = document.createElement("div");
    launcher.className = "hellolabel-touch-launcher";
    launcher.setAttribute("role", "toolbar");
    launcher.setAttribute("aria-label", "Touch panels");
    launcher.innerHTML = `
      <button type="button" data-touch-menu>菜单</button>
      <button type="button" data-touch-panel="images">图片</button>
      <button type="button" data-touch-panel="annotations">标注</button>
      <button type="button" data-touch-panel="ai">AI</button>
    `;
    workspace.appendChild(launcher);

    const mask = document.createElement("div");
    mask.className = "hellolabel-touch-drawer-mask";
    mask.hidden = true;
    document.body.appendChild(mask);

    const drawer = document.createElement("section");
    drawer.className = "hellolabel-touch-drawer";
    drawer.hidden = true;
    drawer.setAttribute("aria-hidden", "true");
    drawer.innerHTML = `
      <div class="hellolabel-touch-drawer-header">
        <div class="hellolabel-touch-drawer-title"></div>
        <button class="hellolabel-touch-drawer-close" type="button" aria-label="关闭">×</button>
      </div>
      <div class="hellolabel-touch-drawer-content"></div>
    `;
    document.body.appendChild(drawer);

    const content = drawer.querySelector(".hellolabel-touch-drawer-content");
    const title = drawer.querySelector(".hellolabel-touch-drawer-title");
    const closeButton = drawer.querySelector(".hellolabel-touch-drawer-close");

    const sources = {
      images: { node:sidebar, titleZh:"图片", titleEn:"Images" },
      annotations: { node:inspector, titleZh:"标注 / 实例", titleEn:"Annotations" },
      ai: { node:aiRow, titleZh:"AI 工具", titleEn:"AI tools" },
    };

    const anchors = new Map();
    for (const { node } of Object.values(sources)) {
      const marker = document.createComment(`hellolabel-touch-anchor:${node.id || node.className}`);
      node.parentNode?.insertBefore(marker, node);
      anchors.set(node, marker);
    }
    const appMenuAnchor = document.createComment("hellolabel-touch-anchor:appMenu");
    appMenu.parentNode?.insertBefore(appMenuAnchor, appMenu);

    let activeType = null;

    function isEnglish() {
      try { return state?.language === "en"; } catch { return false; }
    }

    function restoreNode(node) {
      const marker = anchors.get(node);
      if (marker?.parentNode && node.parentNode !== marker.parentNode) {
        marker.parentNode.insertBefore(node, marker.nextSibling);
      }
    }

    function restoreAll() {
      for (const { node } of Object.values(sources)) restoreNode(node);
      if (appMenuAnchor.parentNode && appMenu.parentNode !== appMenuAnchor.parentNode) {
        appMenuAnchor.parentNode.insertBefore(appMenu, appMenuAnchor.nextSibling);
      }
      appMenu.classList.remove("hellolabel-touch-app-menu");
    }

    function updateLauncherText() {
      const en = isEnglish();
      const labels = en
        ? { images:"Images", annotations:"Labels", ai:"AI", menu:"Menu" }
        : { images:"图片", annotations:"标注", ai:"AI", menu:"菜单" };
      for (const button of launcher.querySelectorAll("[data-touch-panel]")) {
        button.textContent = labels[button.dataset.touchPanel] || button.dataset.touchPanel;
      }
      const menuButton = launcher.querySelector("[data-touch-menu]");
      if (menuButton) menuButton.textContent = labels.menu;
      closeButton.setAttribute("aria-label", en ? "Close" : "关闭");
    }

    function closeDrawer() {
      if (activeType && sources[activeType]) restoreNode(sources[activeType].node);
      activeType = null;
      drawer.hidden = true;
      mask.hidden = true;
      drawer.setAttribute("aria-hidden", "true");
      document.body.classList.remove("hellolabel-touch-drawer-open");
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }

    function openDrawer(type) {
      const source = sources[type];
      if (!source) return;
      window.HelloLabelLayout?.closeAppMenu?.();
      if (activeType && sources[activeType]) restoreNode(sources[activeType].node);
      activeType = type;
      content.replaceChildren(source.node);
      title.textContent = isEnglish() ? source.titleEn : source.titleZh;
      drawer.hidden = false;
      mask.hidden = false;
      drawer.setAttribute("aria-hidden", "false");
      document.body.classList.add("hellolabel-touch-drawer-open");
      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    }

    function isTouchLayout() {
      return document.documentElement.classList.contains("hellolabel-touch-layout");
    }

    function syncLayout() {
      updateLauncherText();
      if (!isTouchLayout()) {
        closeDrawer();
        window.HelloLabelLayout?.closeAppMenu?.();
        restoreAll();
      }
    }

    launcher.addEventListener("pointerdown", event => {
      if (event.target.closest?.("button")) event.stopPropagation();
    });

    launcher.addEventListener("click", event => {
      const menuButton = event.target.closest?.("button[data-touch-menu]");
      if (menuButton) {
        closeDrawer();
        if (appMenu.parentNode !== document.body) document.body.appendChild(appMenu);
        appMenu.classList.add("hellolabel-touch-app-menu");
        window.HelloLabelLayout?.toggleAppMenu?.();
        return;
      }

      const button = event.target.closest?.("button[data-touch-panel]");
      if (!button) return;
      openDrawer(button.dataset.touchPanel);
    });
    closeButton.addEventListener("click", closeDrawer);
    mask.addEventListener("click", closeDrawer);

    content.addEventListener("click", event => {
      if (event.target.closest?.(".file-item") || event.target.closest?.(".instance-row")) {
        setTimeout(closeDrawer, 0);
      }
    });

    const cross = document.createElement("div");
    cross.className = "touch-crosshair";
    viewport.appendChild(cross);
    let crossTimer = 0;
    const hideCrosshair = () => {
      clearTimeout(crossTimer);
      crossTimer = setTimeout(() => cross.classList.remove("active"), 90);
    };
    viewport.addEventListener("pointermove", event => {
      if (event.pointerType !== "touch") return;
      const rect = viewport.getBoundingClientRect();
      cross.style.left = `${event.clientX - rect.left}px`;
      cross.style.top = `${event.clientY - rect.top}px`;
      cross.classList.add("active");
    }, { passive:true });
    viewport.addEventListener("pointerup", hideCrosshair, { passive:true });
    viewport.addEventListener("pointercancel", hideCrosshair, { passive:true });

    window.addEventListener("hellolabel:responsive-layout", syncLayout);
    window.addEventListener("resize", syncLayout, { passive:true });

    window.mobileTouchUI = {
      openDrawer,
      closeDrawer,
      refreshDrawer() {},
      setToolState() {
        window.helloLabelPointerInput?.refreshTouchActions?.();
      },
      showAction() {
        window.helloLabelPointerInput?.refreshTouchActions?.();
      },
      syncLayout,
    };

    syncLayout();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initTouchShell, { once:true });
  } else {
    initTouchShell();
  }
})();
