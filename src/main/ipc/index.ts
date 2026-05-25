import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { IndexListParams, IndexSearchParams } from '../../shared/types/computerIndex.js'
import { getDatabasePath } from '../services/database/index.js'
import {
  getComputerIndexStatus,
  listIndexedDirectory,
  listIndexedItems,
  searchComputerIndexItems,
  startComputerIndex,
  stopComputerIndex,
} from '../services/indexer/index.js'
import { wrapHandler } from './result.js'

export function registerIndexIpc() {
  ipcMain.handle(IPC_CHANNELS.index.start, async () =>
    wrapHandler(async () => startComputerIndex()),
  )

  ipcMain.handle(IPC_CHANNELS.index.status, async () =>
    wrapHandler(() => ({
      ...getComputerIndexStatus(),
      databasePath: getDatabasePath() ?? '',
    })),
  )

  ipcMain.handle(IPC_CHANNELS.index.stop, async () =>
    wrapHandler(async () => {
      await stopComputerIndex()
      return getComputerIndexStatus()
    }),
  )

  ipcMain.handle(IPC_CHANNELS.index.search, async (_event, params: IndexSearchParams) =>
    wrapHandler(() => searchComputerIndexItems(params)),
  )

  ipcMain.handle(IPC_CHANNELS.index.list, async (_event, params: IndexListParams = {}) =>
    wrapHandler(() => listIndexedItems(params)),
  )

  ipcMain.handle(IPC_CHANNELS.index.listDirectory, async (_event, directoryPath: string | null = null) =>
    wrapHandler(() => listIndexedDirectory(directoryPath)),
  )
}
