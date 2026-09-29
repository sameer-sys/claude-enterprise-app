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

  // Local MCP/CLI connectors (Electron only; never exposed to the cloud runtime)
  localMcpCall: (connector, method, params = {}) => ipcRenderer.invoke('local-mcp-call', { connector, method, params }),
  localMcpClose: (connectorId) => ipcRenderer.invoke('local-mcp-close', { connectorId }),

  // App info
  getVersion: () => ipcRenderer.invoke('get-version'),

  // Continuous Automation — Prevent Sleep / Suspension
  startAutomation: () => ipcRenderer.invoke('start-automation'),
  stopAutomation: () => ipcRenderer.invoke('stop-automation'),
});

