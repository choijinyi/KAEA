const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('installerAPI', {
  getSteps: () => ipcRenderer.invoke('get-steps'),
  scan: () => ipcRenderer.invoke('scan'),
  startInstall: (selectedIds) => ipcRenderer.invoke('start-install', selectedIds),
  openIDE: () => ipcRenderer.invoke('open-ide'),
  onStepUpdate: (cb) => ipcRenderer.on('step-update', (_e, data) => cb(data)),
  onLog: (cb) => ipcRenderer.on('log', (_e, text) => cb(text)),
  onFinished: (cb) => ipcRenderer.on('install-finished', (_e, results) => cb(results)),
});
