const { contextBridge, ipcRenderer } = require('electron');

// Expose native desktop APIs to the web app
// The web app can check window.electronAPI to know it is running inside Electron
contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,

  // File System (for Cowork mode — native dialogs instead of browser File Access API)
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', { filePath, content }),
  newFile: () => ipcRenderer.invoke('new-file'),
  executeCode: (code, language) => ipcRenderer.invoke('execute-code', { code, language }),

  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Continuous Automation — Prevent Sleep / Suspension
  startAutomation: () => ipcRenderer.invoke('start-automation'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),

  // OpenWork Native Browser Control
  browser: {
    show: (bounds, sessionId) => ipcRenderer.invoke('openwork:browser:show', bounds, sessionId),
    hide: (options) => ipcRenderer.invoke('openwork:browser:hide', options),
    navigate: (url) => ipcRenderer.invoke('openwork:browser:navigate', url),
    openUrl: (url) => ipcRenderer.invoke('openwork:browser:openUrl', url),
    back: () => ipcRenderer.invoke('openwork:browser:back'),
    forward: () => ipcRenderer.invoke('openwork:browser:forward'),
    reload: () => ipcRenderer.invoke('openwork:browser:reload'),
    bounds: (bounds) => ipcRenderer.invoke('openwork:browser:bounds', bounds),
    getState: () => ipcRenderer.invoke('openwork:browser:state'),
    createTab: (url, sessionId) => ipcRenderer.invoke('openwork:browser:createTab', url, sessionId),
    closeTab: (tabId) => ipcRenderer.invoke('openwork:browser:closeTab', tabId),
    selectTab: (tabId) => ipcRenderer.invoke('openwork:browser:selectTab', tabId),
  },
});

