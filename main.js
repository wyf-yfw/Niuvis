import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadInstalledApps, openInstalledApp } from './src/main/installedApps.js'
import { addLibraryFiles, listLibraryItems } from './src/main/localLibrary.js'
import { listDirectory, listRoots } from './src/main/fileBrowser.js'
import { sendChatMessage } from './src/main/chatService.js'
import { loadChatSettings, resolveChatConfig, saveChatSettings } from './src/main/settingsStore.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function getInstalledAppsCachePath() {
  return path.join(app.getPath('userData'), 'installed-apps-cache.json')
}

function getLibraryRoot() {
  return path.join(app.getPath('userData'), 'library')
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}

async function getStoredChatSettings() {
  return loadChatSettings({ settingsPath: getSettingsPath() })
}

ipcMain.handle('apps:list-installed', async (_event, options = {}) =>
  loadInstalledApps({
    cachePath: getInstalledAppsCachePath(),
    forceRefresh: Boolean(options.forceRefresh),
  }),
)
ipcMain.handle('apps:open', async (_event, appToOpen) => openInstalledApp(appToOpen))
ipcMain.handle('library:list', async (_event, kind) =>
  listLibraryItems({
    libraryRoot: getLibraryRoot(),
    kind,
  }),
)
ipcMain.handle('library:upload', async (_event, kind) => {
  const filters =
    kind === 'gallery'
      ? [{ name: 'Images', extensions: ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'] }]
      : [{ name: 'Documents', extensions: ['doc', 'docx', 'md', 'pdf', 'ppt', 'pptx', 'txt', 'xls', 'xlsx'] }]
  const result = await dialog.showOpenDialog({
    properties: ['openFile', 'multiSelections'],
    filters,
  })

  if (result.canceled) return []

  return addLibraryFiles({
    libraryRoot: getLibraryRoot(),
    kind,
    filePaths: result.filePaths,
  })
})
ipcMain.handle('library:open', async (_event, storedPath) => shell.openPath(storedPath))
ipcMain.handle('computer:list-roots', async () => listRoots())
ipcMain.handle('computer:list-directory', async (_event, directoryPath) => listDirectory(directoryPath))
ipcMain.handle('computer:open', async (_event, itemPath) => shell.openPath(itemPath))
ipcMain.handle('settings:get-chat', async () => getStoredChatSettings())
ipcMain.handle('settings:save-chat', async (_event, chat) =>
  saveChatSettings({
    settingsPath: getSettingsPath(),
    chat,
  }),
)
ipcMain.handle('chat:send', async (_event, messages) => {
  const stored = await getStoredChatSettings()

  return sendChatMessage({
    messages,
    config: resolveChatConfig({ stored }),
  })
})

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'src/preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(__dirname, 'dist/renderer/index.html'))
  }
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
