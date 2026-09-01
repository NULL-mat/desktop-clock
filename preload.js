const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('clock', {
  ready: () => ipcRenderer.send('renderer-ready'),
  contextMenu: () => ipcRenderer.send('show-context-menu'),
  resize: (w, h) => ipcRenderer.send('resize-window', { w, h }),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  setSetting: (patch) => ipcRenderer.send('setting-set', patch),
  pickBackground: () => ipcRenderer.send('pick-background'),
  pickJsonTheme: () => ipcRenderer.send('pick-json-theme'),
  openSettings: () => ipcRenderer.send('open-settings'),
  countdownDone: () => ipcRenderer.send('countdown-finished'),
  onSettings: (cb) => ipcRenderer.on('settings-changed', (_e, s) => cb(s))
});