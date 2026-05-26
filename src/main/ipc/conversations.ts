import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import {
  createConversation,
  deleteConversation,
  getConversation,
  listConversations,
  searchConversations,
  updateConversation,
} from '../services/database/conversations.js'
import { wrapHandler } from './result.js'

export function registerConversationsIpc() {
  ipcMain.handle(IPC_CHANNELS.conversations.list, async () => wrapHandler(() => listConversations()))

  ipcMain.handle(IPC_CHANNELS.conversations.get, async (_event, conversationId: string) =>
    wrapHandler(() => {
      const conversation = getConversation(conversationId)

      if (!conversation) {
        throw new Error('会话不存在')
      }

      return conversation
    }),
  )

  ipcMain.handle(IPC_CHANNELS.conversations.create, async (_event, title?: string) =>
    wrapHandler(() => createConversation(title)),
  )

  ipcMain.handle(
    IPC_CHANNELS.conversations.update,
    async (
      _event,
      payload: { id: string; title?: string; pinned?: boolean },
    ) => wrapHandler(() => {
      updateConversation(payload.id, { title: payload.title, pinned: payload.pinned })
      return getConversation(payload.id)
    }),
  )

  ipcMain.handle(IPC_CHANNELS.conversations.delete, async (_event, conversationId: string) =>
    wrapHandler(() => {
      deleteConversation(conversationId)
      return { deleted: true }
    }),
  )

  ipcMain.handle(IPC_CHANNELS.conversations.search, async (_event, query: string) =>
    wrapHandler(() => searchConversations(query)),
  )
}
