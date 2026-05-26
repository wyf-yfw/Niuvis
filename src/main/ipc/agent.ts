import fs from 'node:fs/promises'
import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { AgentRunRequest } from '../../shared/types/agent.js'
import { prepareAgentRun, runAgentTurn, stopAgentRunById } from '../agents/orchestrator.js'
import { readContentSnippet } from '../services/indexer/documents.js'
import { wrapHandler } from './result.js'

export function registerAgentIpc() {
  ipcMain.handle(IPC_CHANNELS.agent.run, async (event, request: AgentRunRequest) =>
    wrapHandler(async () => {
      const prepared = await prepareAgentRun(request)

      void runAgentTurn(request, event.sender, prepared).catch((error) => {
        console.error('[Niuvis] agent run failed:', error)
      })

      return {
        runId: prepared.runId,
        conversationId: prepared.conversationId,
      }
    }),
  )

  ipcMain.handle(IPC_CHANNELS.agent.stop, async (_event, runId: string) =>
    wrapHandler(() => {
      stopAgentRunById(runId)
      return { stopped: true }
    }),
  )

  ipcMain.handle(IPC_CHANNELS.agent.previewFile, async (_event, filePath: string) =>
    wrapHandler(async () => {
      const stat = await fs.stat(filePath)
      const snippet = stat.isFile() ? await readContentSnippet(filePath) : ''

      return {
        path: filePath,
        isDirectory: stat.isDirectory(),
        size: stat.size,
        content: snippet.slice(0, 12000),
      }
    }),
  )
}
