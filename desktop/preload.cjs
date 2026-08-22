const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helloLabelDesktop', {
  isDesktop: true,
  platform: process.platform,
  quit: () => ipcRenderer.invoke('hellolabel:quit'),
  installAI: () => ipcRenderer.invoke('hellolabel:install-ai')
});
