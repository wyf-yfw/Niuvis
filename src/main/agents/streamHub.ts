import type { WebContents } from 'electron'
import type { AgentStreamEvent } from '../../shared/types/agent.js'

export const AGENT_STREAM_CHANNEL = 'agent:stream'

const runControllers = new Map<string, AbortController>()

export function createRunAbortController(runId: string) {
  const controller = new AbortController()
  runControllers.set(runId, controller)

  return controller
}

export function getRunAbortSignal(runId: string) {
  return runControllers.get(runId)?.signal
}

export function stopAgentRun(runId: string) {
  const controller = runControllers.get(runId)

  if (controller) {
    controller.abort()
    runControllers.delete(runId)
    return true
  }

  return false
}

export function clearRunAbortController(runId: string) {
  runControllers.delete(runId)
}

export function emitAgentEvent(webContents: WebContents, event: AgentStreamEvent) {
  if (webContents.isDestroyed()) {
    return
  }

  webContents.send(AGENT_STREAM_CHANNEL, event)
}
