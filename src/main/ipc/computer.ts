import { ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import { listDirectory, listRoots } from '../fileBrowser.js'
import { wrapHandler } from './result.js'

export function registerComputerIpc() {
  ipcMain.handle(IPC_CHANNELS.computer.listRoots, async () => wrapHandler(() => listRoots()))

  ipcMain.handle(IPC_CHANNELS.computer.listDirectory, async (_event, directoryPath: string) => {
    if (!directoryPath || typeof directoryPath !== 'string') {
      return wrapHandler(() => {
        throw new Error('目录路径无效')
      })
    }

    return wrapHandler(() => listDirectory(directoryPath))
  })

  ipcMain.handle(IPC_CHANNELS.computer.open, async (_event, itemPath: string) =>
    wrapHandler(() => shell.openPath(itemPath)),
  )
}
