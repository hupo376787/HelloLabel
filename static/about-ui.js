"use strict";

(() => {
  const APP_VERSION = "1.4.1";
  const REPOSITORY_URL = "https://github.com/hupo376787/HelloLabel";

  if (typeof I18N !== "undefined") {
    Object.assign(I18N.zh, {
      helpVertex: "多边形/折线：靠近边线吸附后单击插入顶点",
      modePolygon: "多边形：依次单击顶点；靠近起点自动吸附，单击闭合；右键回撤一个点。",
      modeLinestrip: "折线：依次单击顶点；Enter 完成；右键回撤一个点。",
      sequenceHint: "{type}：继续点击添加顶点；右键回撤一个点，Enter 可完成。"
    });
    Object.assign(I18N.en, {
      helpVertex: "Polygon/polyline: hover near an edge to snap, then click to insert a vertex",
      modePolygon: "Polygon: click vertices; move near the start to snap, then click once to close; right-click removes one point.",
      modeLinestrip: "Polyline: click vertices; Enter finishes; right-click removes one point.",
      sequenceHint: "{type}: click to add vertices; right-click removes one point; Enter finishes."
    });
    try { applyLanguage(state.language, false); } catch {}
  }

  function isEnglish() {
    return state?.language === "en";
  }

  function modalWithClass(options, className) {
    const promise = showModal(options);
    els.modalCard?.classList.add(className);
    return Promise.resolve(promise).finally(() => els.modalCard?.classList.remove(className));
  }

  function aboutHtml() {
    const en = isEnglish();
    const copy = en ? {
      tagline: "AI-assisted high-performance image annotation",
      description: "A Labelme-compatible annotation application with WebGL2 rendering and SAM / YOLO assisted annotation.",
      version: "Version",
      author: "Author",
      repo: "GitHub repository",
      format: "Annotation format",
      platform: "Platforms",
      license: "License",
      formatValue: "Labelme JSON",
      platformValue: "Windows · macOS · Linux · Web",
      footer: "Local-first annotation workflow · AI components are installed on demand"
    } : {
      tagline: "AI 辅助高性能图像标注工具",
      description: "兼容 Labelme JSON，支持 WebGL2 高性能渲染，以及 SAM / YOLO 辅助标注。",
      version: "版本",
      author: "作者",
      repo: "GitHub 仓库",
      format: "标注格式",
      platform: "支持平台",
      license: "开源许可",
      formatValue: "Labelme JSON",
      platformValue: "Windows · macOS · Linux · Web",
      footer: "本地优先的标注工作流 · AI 组件按需安装"
    };

    return `
      <div class="about-dialog">
        <div class="about-hero">
          <div class="about-logo-wrap">
            <img class="about-logo" src="/static/hellolabel-icon.png?v=hellolabel-v0214" alt="HelloLabel" />
          </div>
          <div class="about-main">
            <div class="about-product-row">
              <div>
                <div class="about-product">HelloLabel</div>
                <div class="about-tagline">${escapeHtml(copy.tagline)}</div>
              </div>
              <span class="about-version-badge">v${APP_VERSION}</span>
            </div>
            <p class="about-description">${escapeHtml(copy.description)}</p>
            <div class="about-tags">
              <span>Labelme</span><span>WebGL2</span><span>SAM</span><span>YOLO</span>
            </div>
            <div class="about-meta-grid">
              <div class="about-meta-label">${escapeHtml(copy.version)}</div><div class="about-meta-value">${APP_VERSION}</div>
              <div class="about-meta-label">${escapeHtml(copy.author)}</div><div class="about-meta-value about-author">猫叔Vincent</div>
              <div class="about-meta-label">${escapeHtml(copy.repo)}</div><div class="about-meta-value"><a class="about-link" href="${REPOSITORY_URL}" target="_blank" rel="noopener noreferrer">${REPOSITORY_URL}</a></div>
              <div class="about-meta-label">${escapeHtml(copy.format)}</div><div class="about-meta-value">${escapeHtml(copy.formatValue)}</div>
              <div class="about-meta-label">${escapeHtml(copy.platform)}</div><div class="about-meta-value">${escapeHtml(copy.platformValue)}</div>
              <div class="about-meta-label">${escapeHtml(copy.license)}</div><div class="about-meta-value">MIT License</div>
            </div>
          </div>
        </div>
        <div class="about-footer">${escapeHtml(copy.footer)}</div>
      </div>`;
  }

  showAbout = async function() {
    await modalWithClass({
      title: t("menuAboutHelloLabel"),
      body: aboutHtml(),
      buttons: [{ label: t("close"), value: "ok", className: "primary" }]
    }, "about-modal-card");
  };

  function shortcutSections() {
    const en = isEnglish();
    if (en) return [
      {
        title: "Tool keys",
        rows: [
          ["V", "Pointer: select a shape; drag the shape to move it; drag handles to edit geometry."],
          ["B", "Brush: click once to start, move along the outline, and return near the start to close automatically."],
          ["P", "Polygon: click vertices; move to the start point to snap, then single-click to close."],
          ["R", "Rectangle: click one corner, move for preview, click the opposite corner."],
          ["O", "Oriented rectangle: click two points for the first edge, then click again to set width."],
          ["C", "Circle: click center, move for preview, click the circumference."],
          ["D", "Point: single-click to create a point annotation."],
          ["L", "Line: click the start and end points."],
          ["K", "Polyline: click vertices; press Enter to finish."]
        ]
      },
      {
        title: "Mouse & geometry",
        rows: [
          ["Wheel", "Zoom the image around the pointer."],
          ["Middle-drag", "Pan the image."],
          ["Space + drag", "Pan the image with the left mouse button."],
          ["Hover shape / row", "Temporarily highlights the annotation without changing selection."],
          ["Ctrl/Cmd + click", "Add or remove a canvas shape from the current multi-selection."],
          ["Edge + click", "Polygon/polyline edges snap under the pointer; click once to insert a new movable vertex."],
          ["Right-click while drawing", "Polygon/polyline: remove the last point, one point per click, all the way to zero."],
          ["Right-click completed shape", "Polygon, polyline, rectangle, oriented rectangle, circle or line: reopen it in drawing mode. Esc restores the original shape."],
          ["Right-click in SAM", "Add a negative prompt point."]
        ]
      },
      {
        title: "General commands",
        rows: [
          ["Ctrl/Cmd+O", "Open an image folder."],
          ["Ctrl/Cmd+S", "Save the current Labelme JSON."],
          ["Ctrl/Cmd+Z", "Undo the last completed edit. While drawing a polygon/polyline, point rollback is right-click only."],
          ["Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z", "Redo."],
          ["Delete / Backspace", "If a polygon/polyline control point is active, remove that vertex when valid; otherwise delete the selected instance(s)."],
          ["Enter", "Finish the current sequence drawing; in SAM mode, accept the current result."],
          ["Esc", "Cancel the current drawing or AI interaction. If a completed shape was reopened, restore the original."]
        ]
      },
      {
        title: "SAM interaction",
        rows: [
          ["Left click", "Add a positive prompt point."],
          ["Right click", "Add a negative prompt point."],
          ["Left-drag", "Create a Box Prompt."],
          ["Backspace", "Remove the last SAM prompt."],
          ["Enter", "Accept the current segmentation result."],
          ["Esc", "Cancel the current SAM interaction."]
        ]
      }
    ];

    return [
      {
        title: "工具快捷键",
        rows: [
          ["V", "指针：选择标注；拖动实例可移动位置，拖动控制点可修改形状。"],
          ["B", "画笔：单击开始，移动鼠标沿轮廓绘制，回到起点附近自动闭合。"],
          ["P", "多边形：依次单击顶点；移动到起点会自动吸附，单击一次闭合。"],
          ["R", "矩形：单击一个角开始，移动鼠标预览，再单击另一角完成。"],
          ["O", "有向矩形：先单击两点确定第一条边，再单击确定宽度。"],
          ["C", "圆形：单击圆心开始，移动鼠标预览，再单击圆周位置完成。"],
          ["D", "点：单击创建一个点标注。"],
          ["L", "直线：依次单击起点和终点。"],
          ["K", "折线：依次单击添加折点，按 Enter 完成。"]
        ]
      },
      {
        title: "鼠标与几何编辑",
        rows: [
          ["鼠标滚轮", "以鼠标位置为中心缩放图片视图。"],
          ["鼠标中键拖动", "平移图片视图。"],
          ["Space + 拖动", "按住空格键后用左键拖动，平移图片视图。"],
          ["悬停实例 / 列表行", "临时高亮对应实例，不改变当前选中状态。"],
          ["Ctrl/Cmd + 单击", "在画布上将实例加入或移出当前多选。"],
          ["边线吸附 + 单击", "多边形/折线边缘会自动吸附；单击一次插入一个新的可移动角点。"],
          ["绘制中右键", "多边形/折线每右击一次回撤最后一个点，可以一直回撤到 0 个点。"],
          ["完成图形后右键", "多边形、折线、矩形、有向矩形、圆形、直线可重新进入绘制状态；此时按 Esc 恢复原图形。"],
          ["SAM 中右键", "添加一个负样本提示点。"]
        ]
      },
      {
        title: "通用操作",
        rows: [
          ["Ctrl/Cmd+O", "打开图片文件夹。"],
          ["Ctrl/Cmd+S", "保存当前图片的 Labelme JSON。"],
          ["Ctrl/Cmd+Z", "撤销上一次已经完成的操作。正在绘制多边形/折线时，单点回撤只使用鼠标右键。"],
          ["Ctrl/Cmd+Y / Ctrl/Cmd+Shift+Z", "重做。"],
          ["Delete / Backspace", "当前激活的是多边形/折线角点时优先删除该角点（满足最小点数时）；否则删除选中的实例。"],
          ["Enter", "完成当前序列绘制；SAM 模式下接受当前分割结果。"],
          ["Esc", "取消当前绘制或 AI 交互；如果刚用右键重新打开了已完成图形，则恢复原图形。"]
        ]
      },
      {
        title: "SAM 交互",
        rows: [
          ["左键单击", "添加正样本提示点。"],
          ["右键单击", "添加负样本提示点。"],
          ["左键拖动", "创建 Box Prompt。"],
          ["Backspace", "撤销最后一个 SAM 提示点或提示框。"],
          ["Enter", "接受当前分割结果。"],
          ["Esc", "取消当前 SAM 交互。"]
        ]
      }
    ];
  }

  function shortcutsHtml() {
    const sections = shortcutSections();
    return `<div class="shortcuts-dialog">
      <div class="shortcut-callout">${isEnglish()
        ? "Right-click is context-sensitive: it rolls back polygon/polyline points, reopens completed geometry, and creates negative prompts in SAM mode."
        : "鼠标右键会根据当前状态执行不同操作：多边形/折线逐点回撤、已完成图形重新进入绘制状态、SAM 添加负样本。"}</div>
      <div class="shortcut-sections">${sections.map(section => `
        <section class="shortcut-section">
          <h3>${escapeHtml(section.title)}</h3>
          <div class="shortcut-table">${section.rows.map(([key, description]) => `
            <div class="shortcut-row">
              <div class="shortcut-key"><kbd>${escapeHtml(key)}</kbd></div>
              <div class="shortcut-description">${escapeHtml(description)}</div>
            </div>`).join("")}</div>
        </section>`).join("")}</div>
    </div>`;
  }

  showShortcuts = async function() {
    await modalWithClass({
      title: t("shortcuts"),
      body: shortcutsHtml(),
      buttons: [{ label: t("close"), value: "ok", className: "primary" }]
    }, "shortcuts-modal-card");
  };
})();
