"use strict";

window.HelloLabelI18nMessages = window.HelloLabelI18nMessages || {};
Object.assign(window.HelloLabelI18nMessages.zh ||= {}, {
  "mainMenu": "主菜单",
  "menuFile": "文件",
  "menuView": "视图",
  "menuEdit": "编辑",
  "menuAI": "AI",
  "menuSettings": "设置",
  "menuAbout": "关于",
  "menuClose": "关闭窗口",
  "installAI": "下载浏览器 AI",
  "installAIConfirmTitle": "下载浏览器 AI",
  "installAIConfirmText": "将下载并初始化 YOLO11 Detect、YOLO11 Seg 和 SAM2.1 Tiny。模型缓存在当前浏览器中，图片不会上传到 HelloLabel 服务器。是否继续？",
  "installAILaunching": "正在下载并初始化浏览器 AI…",
  "installAIStarted": "浏览器 AI 已下载并初始化完成。后续通常无需重新下载。",
  "installAIUnavailable": "浏览器 AI 运行时尚未加载，请刷新页面后重试。",
  "installAIError": "浏览器 AI 初始化失败：{message}",
  "menuLeftPanel": "左侧图片栏",
  "menuRightPanel": "右侧标注栏",
  "menuTheme": "切换主题",
  "menuAboutHelloLabel": "关于 HelloLabel",
  "collapseLeftPanel": "折叠/展开左侧图片栏",
  "collapseRightPanel": "折叠/展开右侧标注栏",
  "aboutText": "HelloLabel · AI 辅助图像标注工具\n兼容 Labelme JSON，支持 WebGL2 高性能标注、SAM / YOLO 辅助标注。",
  "shortcutsText": "V 指针 · B 画笔 · P 多边形 · R 矩形 · O 有向矩形 · C 圆形 · D 点 · L 直线 · K 折线\nCtrl+O 打开文件夹 · Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Y 重做"
});
