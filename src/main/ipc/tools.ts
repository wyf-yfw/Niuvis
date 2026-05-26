import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/constants/channels.js'
import type { ToolApproveRequest, ToolInvokeRequest, ToolRejectRequest } from '../../shared/types/tools.js'
import { approveToolCall, invokeTool, listPendingApprovals, listTools, rejectToolCall } from '../agents/runtime.js'
import { wrapHandler } from './result.js'

export function registerToolsIpc() {
  ipcMain.handle(IPC_CHANNELS.tools.list, async () => wrapHandler(() => listTools()))

  ipcMain.handle(IPC_CHANNELS.tools.invoke, async (_event, request: ToolInvokeRequest) =>
    wrapHandler(() => invokeTool(request)),
  )

  ipcMain.handle(IPC_CHANNELS.agent.pending, async () => wrapHandler(() => listPendingApprovals()))

  ipcMain.handle(IPC_CHANNELS.agent.approve, async (_event, request: ToolApproveRequest) =>
    wrapHandler(() => approveToolCall(request)),
  )

  ipcMain.handle(IPC_CHANNELS.agent.reject, async (_event, request: ToolRejectRequest) =>
    wrapHandler(() => rejectToolCall(request)),
  )
}
