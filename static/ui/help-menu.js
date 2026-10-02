"use strict";

(() => {
  let c = null;

  function configure(context) {
    c = context || null;
    return api;
  }

  async function showAbout() {
    if (typeof window.HelloLabelAboutUI?.showAbout === "function") {
      return window.HelloLabelAboutUI.showAbout();
    }
    const { showModal, t, escapeHtml } = c;
    await showModal({
      title:t("menuAboutHelloLabel"),
      body:`<div style="white-space:pre-line">${escapeHtml(t("aboutText"))}</div><div class="muted" style="padding-left:0">Version 2.2.0</div>`,
      buttons:[{label:t("close"),value:"ok",className:"primary"}]
    });
  }

  async function showShortcuts() {
    if (typeof window.HelloLabelAboutUI?.showShortcuts === "function") {
      return window.HelloLabelAboutUI.showShortcuts();
    }
    const { state, showModal, t, escapeHtml } = c;
    const zh = state.language !== "en";
    const rows = zh ? [
      ["V","指针：选择标注；拖动标注可移动位置，拖动控制点可修改形状。"],
      ["B","画笔：单击开始绘制，移动鼠标沿轮廓描绘，靠近起点时自动闭合。"],
      ["P","多边形：依次单击添加顶点，按 Enter 或双击完成。"],
      ["R","矩形：单击一个角开始，移动鼠标实时预览，再单击另一角完成。"],
      ["O","有向矩形：先单击两点确定一条边，再单击确定矩形宽度。"],
      ["C","圆形：单击圆心开始，移动鼠标实时预览，再单击圆周位置完成。"],
      ["D","点：单击创建一个点标注。"],
      ["L","直线：依次单击起点和终点。"],
      ["K","折线：依次单击添加折点，按 Enter 或双击完成。"],
      ["鼠标滚轮","缩放图片视图。"],
      ["鼠标中键拖动","平移图片视图。"],
      ["Space + 拖动","按住空格键并拖动鼠标，平移图片视图。"],
      ["Enter","完成当前多边形/折线；AI 交互模式下接受当前分割结果。"],
      ["Esc","取消当前绘制或取消 AI 交互。"],
      ["Backspace","AI 交互模式下撤销最后一个提示点或提示框。"],
      ["Delete","删除选中的实例；编辑多边形/折线顶点时删除当前顶点。"],
      ["双击边线","在多边形或折线的边上插入一个新顶点。"],
      ["Ctrl + O","打开图片文件夹。"],
      ["Ctrl + S","立即保存当前 Labelme JSON。"],
      ["Ctrl + Z","撤销上一步操作。"],
      ["Ctrl + Y","重做上一步被撤销的操作。"],
      ["Ctrl + Shift + Z","重做上一步被撤销的操作。"]
    ] : [
      ["V","Pointer: select annotations; drag a shape to move it, or drag handles to edit its geometry."],
      ["B","Brush: click once to start, move along the outline, and return near the start point to close automatically."],
      ["P","Polygon: click to add vertices; press Enter or double-click to finish."],
      ["R","Rectangle: click one corner to start, move the mouse for a live preview, then click the opposite corner to finish."],
      ["O","Oriented Rectangle: click two points to define an edge, then click again to set the width."],
      ["C","Circle: click the center to start, move the mouse for a live preview, then click the circumference to finish."],
      ["D","Point: click once to create a point annotation."],
      ["L","Line: click the start point and then the end point."],
      ["K","Polyline: click to add vertices; press Enter or double-click to finish."],
      ["Mouse wheel","Zoom the image view."],
      ["Middle-button drag","Pan the image view."],
      ["Space + drag","Hold Space and drag the mouse to pan the image view."],
      ["Enter","Finish the current polygon/polyline; in AI mode, accept the current segmentation result."],
      ["Esc","Cancel the current drawing or AI interaction."],
      ["Backspace","In AI mode, remove the most recent prompt point or box."],
      ["Delete","Delete the selected instance; while editing polygon/polyline vertices, delete the active vertex."],
      ["Double-click edge","Insert a new vertex on a polygon or polyline edge."],
      ["Ctrl + O","Open an image folder."],
      ["Ctrl + S","Save the current Labelme JSON immediately."],
      ["Ctrl + Z","Undo the previous operation."],
      ["Ctrl + Y","Redo the last undone operation."],
      ["Ctrl + Shift + Z","Redo the last undone operation."]
    ];

    const body = `<div class="shortcut-list">${rows.map(([key,desc]) =>
      `<div class="shortcut-row"><kbd>${escapeHtml(key)}</kbd><span>${escapeHtml(desc)}</span></div>`
    ).join("")}</div>`;

    await showModal({
      title:t("shortcuts"),
      body,
      buttons:[{label:t("close"),value:"ok",className:"primary"}]
    });
  }

  async function installAIFromMenu() {
    const { showModal, t, escapeHtml } = c;
    const browserUi = window.HelloLabelBrowserRuntimeUI;
    if (typeof browserUi?.installAIFromMenu === "function") {
      return browserUi.installAIFromMenu();
    }
    await showModal({
      title:t("installAIConfirmTitle"),
      body:`<div class="danger-note">${escapeHtml(t("installAIUnavailable"))}</div>`,
      buttons:[{label:t("close"),value:"ok",className:"primary"}]
    });
  }

  async function runMenuCommand(command) {
    const {
      state, closeAppMenu, requestFolder, saveJsonToFolder, setSaveState, t, setStatus,
      deleteCurrentJson, togglePanel, applyAiToolbarVisibility, installAI,
      fitToWindow, actualSize, undo, redo, deleteSelected,
      applyLanguage, cycleTheme, showModelStatus
    } = c;

    closeAppMenu();

    if (command === "open-folder") return requestFolder();
    if (command === "save") {
      return saveJsonToFolder(true).catch(error => {
        setSaveState(t("saveFailed"), "error");
        setStatus(error.message, true);
      });
    }
    if (command === "delete-json") return deleteCurrentJson();
    if (command === "close") {
      if (window.helloLabelDesktop?.quit) return window.helloLabelDesktop.quit();
      window.close();
      return;
    }

    if (command === "toggle-left") return togglePanel("left");
    if (command === "toggle-right") return togglePanel("right");
    if (command === "toggle-ai") return applyAiToolbarVisibility(!state.aiToolbarVisible);
    if (command === "install-ai") return installAI();
    if (command === "fit") return fitToWindow();
    if (command === "actual") return actualSize();
    if (command === "undo") return undo();
    if (command === "redo") return redo();
    if (command === "delete") return deleteSelected();
    if (command === "lang-zh") return applyLanguage("zh");
    if (command === "lang-en") return applyLanguage("en");
    if (command === "theme") return cycleTheme();
    if (command === "model-status") return showModelStatus();
    if (command === "about") return showAbout();
    if (command === "shortcuts") return showShortcuts();
  }

  const api = { configure, showAbout, showShortcuts, installAIFromMenu, runMenuCommand };
  window.HelloLabelHelpMenu = api;
})();
