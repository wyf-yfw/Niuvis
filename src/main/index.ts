import { app, BrowserWindow } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getSettingsPath } from './ipc/context.js'
import { registerIpcHandlers } from './ipc/registerIpc.js'
import { initDatabase } from './services/database/index.js'
import { migrateSettingsFromJsonIfNeeded } from './services/settings/index.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** 编译后为 dist/main/index.js，项目根目录为上两级 */
const projectRoot = path.join(__dirname, '..', '..')

function getPreloadPath() {
  return path.resolve(projectRoot, 'src', 'preload.cjs')
}

function getRendererHtmlPath() {
  return path.join(projectRoot, 'dist', 'renderer', 'index.html')
}

function createWindow() {
  const preloadPath = getPreloadPath()

  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: preloadPath,
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
    },
  })

  win.webContents.on('preload-error', (_event, preloadPathArg, error) => {
    console.error('[Niuvis] preload 加载失败:', preloadPathArg, error)
  })

  if (process.env.NODE_ENV === 'development') {
    void win.loadURL('http://127.0.0.1:5173')
    win.webContents.openDevTools()
  } else {
    void win.loadFile(getRendererHtmlPath())
  }
}

registerIpcHandlers()

app.whenReady().then(async () => {
  try {
    initDatabase({ userDataPath: app.getPath('userData') })
    await migrateSettingsFromJsonIfNeeded({ settingsPath: getSettingsPath() })
  } catch (error) {
    console.error('[Niuvis] 数据库初始化失败，部分功能可能不可用:', error)
  }

  createWindow()
})

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
