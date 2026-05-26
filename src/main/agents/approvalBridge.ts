import type { ToolInvokeResult } from '../../shared/types/tools.js'

interface ToolDecisionWaiter {
  resolve: (result: ToolInvokeResult) => void
  reject: (error: Error) => void
}

const waiters = new Map<string, ToolDecisionWaiter>()

export function waitForToolDecision(toolCallId: string) {
  return new Promise<ToolInvokeResult>((resolve, reject) => {
    waiters.set(toolCallId, { resolve, reject })
  })
}

export function notifyToolDecision(toolCallId: string, result: ToolInvokeResult) {
  const waiter = waiters.get(toolCallId)

  if (waiter) {
    waiter.resolve(result)
    waiters.delete(toolCallId)
  }
}

export function cancelToolDecision(toolCallId: string, error: Error) {
  const waiter = waiters.get(toolCallId)

  if (waiter) {
    waiter.reject(error)
    waiters.delete(toolCallId)
  }
}
