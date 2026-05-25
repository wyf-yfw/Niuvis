import { dialog, ipcMain, shell } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { LibraryKind } from '../../shared/types/library.js'
import { addLibraryFiles, listLibraryItems } from '../localLibrary.js'
import { getLibraryRoot } from './context.js'
import { wrapHandler } from './result.js'

export function registerLibraryIpc() {
  ipcMain.handle(IPC_CHANNELS.library.list, async (_event, kind: LibraryKind) =>
    wrapHandler(() =>
      listLibraryItems({
        libraryRoot: getLibraryRoot(),
        kind,
      }),
    ),
  )

  ipcMain.handle(IPC_CHANNELS.library.upload, async (_event, kind: LibraryKind) =>
    wrapHandler(async () => {
      const filters =
        kind === 'gallery'
          ? [{ name: 'Images', extensions: ['avif', 'gif', 'jpeg', 'jpg', 'png', 'svg', 'webp'] }]
          : [
              {
                name: 'Documents',
                extensions: ['doc', 'docx', 'md', 'pdf', 'ppt', 'pptx', 'txt', 'xls', 'xlsx'],
              },
            ]
      const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'],
        filters,
      })

      if (result.canceled) return []

      return addLibraryFiles({
        libraryRoot: getLibraryRoot(),
        kind,
        filePaths: result.filePaths,
      })
    }),
  )

  ipcMain.handle(IPC_CHANNELS.library.open, async (_event, storedPath: string) =>
    wrapHandler(() => shell.openPath(storedPath)),
  )
}
