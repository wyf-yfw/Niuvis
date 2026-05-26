import { registerAgentIpc } from './agent.js'
import { registerConversationsIpc } from './conversations.js'
import { registerIndexIpc } from './index.js'
import { registerToolsIpc } from './tools.js'
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
  registerToolsIpc()
  registerAgentIpc()
  registerConversationsIpc()
}
