const { contextBridge, ipcRenderer } = require('electron')

/** 与 src/shared/constants/channels.json 保持同步 */
const IPC_CHANNELS = {
  apps: {
    listInstalled: 'apps:list-installed',
    open: 'apps:open',
  },
  library: {
    list: 'library:list',
    upload: 'library:upload',
    open: 'library:open',
  },
  computer: {
    listRoots: 'computer:list-roots',
    listDirectory: 'computer:list-directory',
    open: 'computer:open',
  },
  chat: {
    send: 'chat:send',
  },
  settings: {
    get: 'settings:get',
    save: 'settings:save',
    getChat: 'settings:get-chat',
    saveChat: 'settings:save-chat',
    testConnection: 'settings:test-connection',
    pickDirectory: 'settings:pick-directory',
  },
  system: {
    databaseStatus: 'system:database-status',
  },
  index: {
    start: 'index:start',
    status: 'index:status',
    stop: 'index:stop',
    search: 'index:search',
    list: 'index:list',
    listDirectory: 'index:list-directory',
  },
  tools: {
    list: 'tools:list',
    invoke: 'tools:invoke',
  },
  agent: {
    pending: 'agent:pending',
    approve: 'agent:approve',
    reject: 'agent:reject',
    run: 'agent:run',
    stop: 'agent:stop',
    previewFile: 'agent:preview-file',
    stream: 'agent:stream',
  },
  conversations: {
    list: 'conversations:list',
    get: 'conversations:get',
    create: 'conversations:create',
    update: 'conversations:update',
    delete: 'conversations:delete',
    search: 'conversations:search',
  },
}

async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args)

  if (result && typeof result === 'object' && result.ok === true) {
    return result.data
  }

  if (result && typeof result === 'object' && result.ok === false && result.error) {
    const error = new Error(result.error.message)
    error.name = 'NiuvisIpcError'
    error.code = result.error.code
    throw error
  }

  return result
}

contextBridge.exposeInMainWorld('__NIUVIS_ELECTRON__', true)

contextBridge.exposeInMainWorld('niuvisApps', {
  listInstalled: (options) => invoke(IPC_CHANNELS.apps.listInstalled, options),
  open: (appToOpen) => invoke(IPC_CHANNELS.apps.open, appToOpen),
})

contextBridge.exposeInMainWorld('niuvisLibrary', {
  list: (kind) => invoke(IPC_CHANNELS.library.list, kind),
  upload: (kind) => invoke(IPC_CHANNELS.library.upload, kind),
  open: (storedPath) => invoke(IPC_CHANNELS.library.open, storedPath),
})

contextBridge.exposeInMainWorld('niuvisComputer', {
  listRoots: () => invoke(IPC_CHANNELS.computer.listRoots),
  listDirectory: (directoryPath) => invoke(IPC_CHANNELS.computer.listDirectory, directoryPath),
  open: (itemPath) => invoke(IPC_CHANNELS.computer.open, itemPath),
})

contextBridge.exposeInMainWorld('niuvisChat', {
  send: (messages) => invoke(IPC_CHANNELS.chat.send, messages),
})

contextBridge.exposeInMainWorld('niuvisSettings', {
  get: () => invoke(IPC_CHANNELS.settings.get),
  save: (settings) => invoke(IPC_CHANNELS.settings.save, settings),
  getChat: () => invoke(IPC_CHANNELS.settings.getChat),
  saveChat: (chat) => invoke(IPC_CHANNELS.settings.saveChat, chat),
  testConnection: (profile) => invoke(IPC_CHANNELS.settings.testConnection, profile),
  pickDirectory: () => invoke(IPC_CHANNELS.settings.pickDirectory),
})

contextBridge.exposeInMainWorld('niuvisIndex', {
  start: () => invoke(IPC_CHANNELS.index.start),
  status: () => invoke(IPC_CHANNELS.index.status),
  stop: () => invoke(IPC_CHANNELS.index.stop),
  search: (params) => invoke(IPC_CHANNELS.index.search, params),
  list: (params) => invoke(IPC_CHANNELS.index.list, params),
  listDirectory: (directoryPath) => invoke(IPC_CHANNELS.index.listDirectory, directoryPath),
})

contextBridge.exposeInMainWorld('niuvisTools', {
  list: () => invoke(IPC_CHANNELS.tools.list),
  invoke: (request) => invoke(IPC_CHANNELS.tools.invoke, request),
})

contextBridge.exposeInMainWorld('niuvisAgent', {
  pending: () => invoke(IPC_CHANNELS.agent.pending),
  approve: (request) => invoke(IPC_CHANNELS.agent.approve, request),
  reject: (request) => invoke(IPC_CHANNELS.agent.reject, request),
  run: (request) => invoke(IPC_CHANNELS.agent.run, request),
  stop: (runId) => invoke(IPC_CHANNELS.agent.stop, runId),
  previewFile: (filePath) => invoke(IPC_CHANNELS.agent.previewFile, filePath),
  onStream: (listener) => {
    const handler = (_event, payload) => listener(payload)

    ipcRenderer.on(IPC_CHANNELS.agent.stream, handler)

    return () => {
      ipcRenderer.removeListener(IPC_CHANNELS.agent.stream, handler)
    }
  },
})

contextBridge.exposeInMainWorld('niuvisConversations', {
  list: () => invoke(IPC_CHANNELS.conversations.list),
  get: (conversationId) => invoke(IPC_CHANNELS.conversations.get, conversationId),
  create: (title) => invoke(IPC_CHANNELS.conversations.create, title),
  update: (payload) => invoke(IPC_CHANNELS.conversations.update, payload),
  delete: (conversationId) => invoke(IPC_CHANNELS.conversations.delete, conversationId),
  search: (query) => invoke(IPC_CHANNELS.conversations.search, query),
})
