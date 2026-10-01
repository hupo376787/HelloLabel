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
  "installAI": "安装 AI",
  "installAIConfirmTitle": "安装 AI 依赖",
  "installAIConfirmText": "安装 AI 会先关闭当前 HelloLabel 后端并启动独立安装窗口。桌面安装版会使用程序自带 Python 创建 HelloLabel 私有 AI Runtime，不需要系统 Python；源码版仍使用项目 .venv。安装完成后请重新启动 HelloLabel。是否继续？",
  "installAILaunching": "正在启动 AI 安装程序…",
  "installAIStarted": "AI 安装程序正在启动。HelloLabel 将关闭；请在独立安装窗口中等待完成，然后重新启动 HelloLabel。",
  "installAIUnavailable": "当前运行环境无法启动 HelloLabel AI 安装程序。",
  "installAIError": "启动 AI 安装程序失败：{message}",
  "menuLeftPanel": "左侧图片栏",
  "menuRightPanel": "右侧标注栏",
  "menuTheme": "切换主题",
  "menuAboutHelloLabel": "关于 HelloLabel",
  "collapseLeftPanel": "折叠/展开左侧图片栏",
  "collapseRightPanel": "折叠/展开右侧标注栏",
  "aboutText": "HelloLabel · AI 辅助图像标注工具\n兼容 Labelme JSON，支持 WebGL2 高性能标注、SAM / YOLO 辅助标注。",
  "shortcutsText": "V 指针 · B 画笔 · P 多边形 · R 矩形 · O 有向矩形 · C 圆形 · D 点 · L 直线 · K 折线\nCtrl+O 打开文件夹 · Ctrl+S 保存 · Ctrl+Z 撤销 · Ctrl+Y 重做"
});
