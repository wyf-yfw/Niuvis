import { dialog, ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { AppSettings, ModelProfile } from '../../shared/types/settings.js'
import type { ChatModelSettings } from '../../shared/types/chat.js'
import {
  getActiveChatConfig,
  getActiveProfile,
  loadAppSettings,
  saveAppSettings,
  testModelConnection,
} from '../services/settings/index.js'
import { wrapHandler } from './result.js'

export async function getStoredChatSettings(): Promise<ChatModelSettings> {
  return getActiveChatConfig(loadAppSettings())
}

export function registerSettingsIpc() {
  ipcMain.handle(IPC_CHANNELS.settings.get, async () => wrapHandler(() => loadAppSettings()))

  ipcMain.handle(IPC_CHANNELS.settings.save, async (_event, settings: AppSettings) =>
    wrapHandler(() => saveAppSettings(settings)),
  )

  ipcMain.handle(IPC_CHANNELS.settings.getChat, async () => wrapHandler(() => getStoredChatSettings()))

  ipcMain.handle(IPC_CHANNELS.settings.saveChat, async (_event, chat: ChatModelSettings) =>
    wrapHandler(() => {
      const current = loadAppSettings()
      const profile = getActiveProfile(current)

      const nextProfiles = current.profiles.map((item) =>
        item.id === profile.id
          ? {
              ...item,
              apiKey: chat.apiKey,
              baseUrl: chat.baseUrl,
              model: chat.model,
            }
          : item,
      )

      saveAppSettings({
        ...current,
        profiles: nextProfiles,
      })

      return getStoredChatSettings()
    }),
  )

  ipcMain.handle(IPC_CHANNELS.settings.testConnection, async (_event, profile: ModelProfile) =>
    wrapHandler(() => testModelConnection(profile)),
  )

  ipcMain.handle(IPC_CHANNELS.settings.pickDirectory, async () =>
    wrapHandler(async () => {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
      })

      if (result.canceled || result.filePaths.length === 0) {
        return null
      }

      return result.filePaths[0]
    }),
  )
}
