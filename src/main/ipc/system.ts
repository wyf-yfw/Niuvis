import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { DatabaseStatus } from '../../shared/types/ipc.js'
import { getDatabaseStatus } from '../services/database/index.js'
import { wrapHandler } from './result.js'

export function registerSystemIpc() {
  ipcMain.handle(IPC_CHANNELS.system.databaseStatus, async () =>
    wrapHandler((): DatabaseStatus => getDatabaseStatus()),
  )
}
