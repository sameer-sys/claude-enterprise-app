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
});

