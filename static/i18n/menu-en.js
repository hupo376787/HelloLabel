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
  "installAI": "Install AI",
  "installAIConfirmTitle": "Install AI dependencies",
  "installAIConfirmText": "Installing AI will stop the current HelloLabel backend and open a separate installer. Packaged desktop builds use HelloLabel’s bundled Python to create a private AI runtime, so no system Python is required; source mode continues to use the project .venv. Restart HelloLabel when installation finishes. Continue?",
  "installAILaunching": "Launching the AI installer…",
  "installAIStarted": "The AI installer is starting. HelloLabel will close; wait for the separate installer window to finish, then restart HelloLabel.",
  "installAIUnavailable": "This environment could not start the HelloLabel AI installer.",
  "installAIError": "Failed to start the AI installer: {message}",
  "menuLeftPanel": "Left image panel",
  "menuRightPanel": "Right annotation panel",
  "menuTheme": "Switch theme",
  "menuAboutHelloLabel": "About HelloLabel",
  "collapseLeftPanel": "Collapse/expand left image panel",
  "collapseRightPanel": "Collapse/expand right annotation panel",
  "aboutText": "HelloLabel · AI-assisted image annotation\nLabelme-compatible JSON, WebGL2 rendering, SAM / YOLO assisted annotation.",
  "shortcutsText": "V Pointer · B Brush · P Polygon · R Rectangle · O Oriented Rectangle · C Circle · D Point · L Line · K Polyline\nCtrl+O Open folder · Ctrl+S Save · Ctrl+Z Undo · Ctrl+Y Redo"
});
