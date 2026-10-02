"use strict";

window.HelloLabelI18nMessages = window.HelloLabelI18nMessages || {};
Object.assign(window.HelloLabelI18nMessages.en ||= {}, {
  "mainMenu": "Main menu",
  "menuFile": "File",
  "menuView": "View",
  "menuEdit": "Edit",
  "menuAI": "AI",
  "menuSettings": "Settings",
  "menuAbout": "About",
  "menuClose": "Close window",
  "installAI": "Download Browser AI",
  "installAIConfirmTitle": "Download Browser AI",
  "installAIConfirmText": "This downloads and initializes YOLO11 Detect, YOLO11 Seg, and SAM2.1 Tiny. Models are cached in this browser and source images are never uploaded to a HelloLabel server. Continue?",
  "installAILaunching": "Downloading and initializing browser AI…",
  "installAIStarted": "Browser AI models are downloaded and initialized. Later use normally does not require another download.",
  "installAIUnavailable": "The browser AI runtime is not ready yet. Refresh the page and try again.",
  "installAIError": "Browser AI initialization failed: {message}",
  "menuLeftPanel": "Left image panel",
  "menuRightPanel": "Right annotation panel",
  "menuTheme": "Switch theme",
  "menuAboutHelloLabel": "About HelloLabel",
  "collapseLeftPanel": "Collapse/expand left image panel",
  "collapseRightPanel": "Collapse/expand right annotation panel",
  "aboutText": "HelloLabel · AI-assisted image annotation\nLabelme-compatible JSON, WebGL2 rendering, SAM / YOLO assisted annotation.",
  "shortcutsText": "V Pointer · B Brush · P Polygon · R Rectangle · O Oriented Rectangle · C Circle · D Point · L Line · K Polyline\nCtrl+O Open folder · Ctrl+S Save · Ctrl+Z Undo · Ctrl+Y Redo"
});
