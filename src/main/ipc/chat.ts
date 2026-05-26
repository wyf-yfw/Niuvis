import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { ChatMessage } from '../../shared/types/chat.js'
import { sendChatMessage } from '../services/chat/index.js'
import { resolveChatConfig } from '../settingsStore.js'
import { getStoredChatSettings } from './settings.js'
import { wrapHandler } from './result.js'

export function registerChatIpc() {
  ipcMain.handle(IPC_CHANNELS.chat.send, async (_event, messages: ChatMessage[]) =>
    wrapHandler(async () => {
      const stored = await getStoredChatSettings()

      const config = resolveChatConfig({ stored })

      return sendChatMessage({
        messages,
        config: {
          ...config,
          apiMode: config.apiMode === 'responses' ? 'responses' : 'chat',
        },
      })
    }),
  )
}
