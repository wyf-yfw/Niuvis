import { registerIndexIpc } from './index.js'
import { registerAppsIpc } from './apps.js'
import { registerChatIpc } from './chat.js'
import { registerComputerIpc } from './computer.js'
import { registerLibraryIpc } from './library.js'
import { registerSettingsIpc } from './settings.js'
import { registerSystemIpc } from './system.js'

export function registerIpcHandlers() {
  registerAppsIpc()
  registerChatIpc()
  registerComputerIpc()
  registerLibraryIpc()
  registerSettingsIpc()
  registerSystemIpc()
  registerIndexIpc()
}
