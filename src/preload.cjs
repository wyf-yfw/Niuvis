const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('niuvisApps', {
  listInstalled: (options) => ipcRenderer.invoke('apps:list-installed', options),
  open: (appToOpen) => ipcRenderer.invoke('apps:open', appToOpen),
})

contextBridge.exposeInMainWorld('niuvisLibrary', {
  list: (kind) => ipcRenderer.invoke('library:list', kind),
  upload: (kind) => ipcRenderer.invoke('library:upload', kind),
  open: (storedPath) => ipcRenderer.invoke('library:open', storedPath),
})

contextBridge.exposeInMainWorld('niuvisComputer', {
  listRoots: () => ipcRenderer.invoke('computer:list-roots'),
  listDirectory: (directoryPath) => ipcRenderer.invoke('computer:list-directory', directoryPath),
  open: (itemPath) => ipcRenderer.invoke('computer:open', itemPath),
})

contextBridge.exposeInMainWorld('niuvisChat', {
  send: (messages) => ipcRenderer.invoke('chat:send', messages),
})

contextBridge.exposeInMainWorld('niuvisSettings', {
  getChat: () => ipcRenderer.invoke('settings:get-chat'),
  saveChat: (chat) => ipcRenderer.invoke('settings:save-chat', chat),
})
