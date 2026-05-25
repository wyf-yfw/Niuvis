import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import { loadInstalledApps, openInstalledApp } from '../installedApps.js'
import { getInstalledAppsCachePath } from './context.js'
import { wrapHandler } from './result.js'

export function registerAppsIpc() {
  ipcMain.handle(IPC_CHANNELS.apps.listInstalled, async (_event, options: { forceRefresh?: boolean } = {}) =>
    wrapHandler(() =>
      loadInstalledApps({
        cachePath: getInstalledAppsCachePath(),
        forceRefresh: Boolean(options.forceRefresh),
      } as Parameters<typeof loadInstalledApps>[0]),
    ),
  )

  ipcMain.handle(IPC_CHANNELS.apps.open, async (_event, appToOpen) =>
    wrapHandler(() => openInstalledApp(appToOpen)),
  )
}
