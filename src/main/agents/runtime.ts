import fs from 'node:fs/promises'
import type {
  PendingToolCall,
  ToolApproveRequest,
  ToolInvokeRequest,
  ToolInvokeResult,
  ToolPreview,
  ToolRejectRequest,
  ToolRiskLevel,
} from '../../shared/types/tools.js'
import { createAgentRun, finishAgentRun } from '../services/database/agentRuns.js'
import { insertAuditLog } from '../services/database/auditLogs.js'
import {
  getToolCall,
  insertToolCall,
  listPendingToolCalls,
  updateToolCall,
} from '../services/database/toolCalls.js'
import { loadAppSettings } from '../services/settings/store.js'
import {
  assertPathsAllowed,
  extractPathsFromInput,
  requiresConfirmationForTool,
} from './permissions.js'
import { notifyToolDecision } from './approvalBridge.js'
import { getToolByName, listToolDefinitions, validateToolInput } from './tools/index.js'
import { readFileEffectiveRisk } from './tools/read-file.js'
import type { ToolContext } from './tools/types.js'

const autoConfirmUntil = new Map<string, number>()

function autoConfirmKey(toolName: string, riskLevel: ToolRiskLevel) {
  return `${toolName}:${riskLevel}`
}

function isAutoConfirmed(toolName: string, riskLevel: ToolRiskLevel) {
  const until = autoConfirmUntil.get(autoConfirmKey(toolName, riskLevel))

  return until != null && until > Date.now()
}

export function rememberAutoConfirm(toolName: string, riskLevel: ToolRiskLevel, minutes: number) {
  if (minutes <= 0) return

  autoConfirmUntil.set(autoConfirmKey(toolName, riskLevel), Date.now() + minutes * 60_000)
}

async function resolveEffectiveRisk(toolName: string, input: Record<string, unknown>, base: ToolRiskLevel) {
  if (toolName !== 'read_file' || typeof input.path !== 'string') {
    return base
  }

  try {
    const stat = await fs.stat(input.path)
    return readFileEffectiveRisk(stat.size)
  } catch {
    return base
  }
}

function buildPending(toolCallId: string, agentRunId: string, toolName: string, input: unknown, riskLevel: ToolRiskLevel, preview: ToolPreview): PendingToolCall {
  return {
    id: toolCallId,
    agentRunId,
    toolName,
    input,
    riskLevel,
    preview,
    createdAt: new Date().toISOString(),
  }
}

async function executeToolCall(
  toolCallId: string,
  agentRunId: string,
  toolName: string,
  input: Record<string, unknown>,
  approvedByUser: boolean | null,
) {
  const tool = getToolByName(toolName)

  if (!tool) {
    throw new Error(`未知工具：${toolName}`)
  }

  const parsed = validateToolInput(tool, input)
  const preview = tool.preview(parsed)
  const ctx: ToolContext = { agentRunId, toolCallId }
  const started = Date.now()

  updateToolCall(toolCallId, { status: 'running' })

  try {
    const result = await tool.execute(parsed, ctx)

    updateToolCall(toolCallId, {
      status: 'completed',
      result,
      finishedAt: true,
    })

    insertAuditLog({
      action: toolName,
      toolCallId,
      affectedPaths: preview.affectedPaths,
      approvedByUser,
      result: result.summary,
    })

    finishAgentRun(agentRunId, 'completed')

    return result
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    updateToolCall(toolCallId, {
      status: 'failed',
      result: { summary: message },
      finishedAt: true,
    })

    insertAuditLog({
      action: toolName,
      toolCallId,
      affectedPaths: preview.affectedPaths,
      approvedByUser,
      result: 'failed',
      error: message,
    })

    finishAgentRun(agentRunId, 'failed')

    throw error
  } finally {
    void started
  }
}

export function listTools() {
  return listToolDefinitions()
}

export function listPendingApprovals() {
  return listPendingToolCalls().map((row) => {
    const input = JSON.parse(row.inputJson) as Record<string, unknown>
    const tool = getToolByName(row.toolName)
    const preview = tool ? tool.preview(validateToolInput(tool, input)) : {
      summary: row.toolName,
      affectedPaths: extractPathsFromInput(row.toolName, input),
    }

    return buildPending(row.id, row.agentRunId, row.toolName, input, row.riskLevel, preview)
  })
}

export async function invokeTool(request: ToolInvokeRequest & { forceExecute?: boolean }): Promise<ToolInvokeResult> {
  const tool = getToolByName(request.toolName)

  if (!tool) {
    throw new Error(`未知工具：${request.toolName}`)
  }

  const parsed = validateToolInput(tool, request.input) as Record<string, unknown>
  assertPathsAllowed(request.toolName, parsed)

  const agentRunId = request.agentRunId ?? createAgentRun({
    conversationId: request.conversationId,
    userRequest: `tool:${request.toolName}`,
  })

  const riskLevel = await resolveEffectiveRisk(request.toolName, parsed, tool.riskLevel)
  const needsConfirm =
    !request.forceExecute &&
    !isAutoConfirmed(request.toolName, riskLevel) &&
    requiresConfirmationForTool(request.toolName, riskLevel, parsed, tool.requiresConfirmation)

  const preview = tool.preview(parsed)
  const toolCallId = insertToolCall({
    agentRunId,
    toolName: request.toolName,
    input: parsed,
    riskLevel,
    requiresConfirmation: needsConfirm,
    status: needsConfirm ? 'awaiting_approval' : 'running',
  })

  if (needsConfirm) {
    return {
      toolCallId,
      agentRunId,
      status: 'awaiting_approval',
      preview,
    }
  }

  try {
    const result = await executeToolCall(toolCallId, agentRunId, request.toolName, parsed, null)

    return {
      toolCallId,
      agentRunId,
      status: 'completed',
      preview,
      result,
    }
  } catch (error) {
    return {
      toolCallId,
      agentRunId,
      status: 'failed',
      preview,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function approveToolCall(request: ToolApproveRequest): Promise<ToolInvokeResult> {
  const row = getToolCall(request.toolCallId)

  if (!row) {
    throw new Error('工具调用不存在')
  }

  if (row.status !== 'awaiting_approval') {
    throw new Error(`当前状态不可批准：${row.status}`)
  }

  const input = JSON.parse(row.inputJson) as Record<string, unknown>
  const tool = getToolByName(row.toolName)

  if (!tool) {
    throw new Error(`未知工具：${row.toolName}`)
  }

  if (request.rememberMinutes) {
    rememberAutoConfirm(row.toolName, row.riskLevel, request.rememberMinutes)
  }

  try {
    const result = await executeToolCall(row.id, row.agentRunId, row.toolName, input, true)

    const payload = {
      toolCallId: row.id,
      agentRunId: row.agentRunId,
      status: 'completed' as const,
      preview: tool.preview(validateToolInput(tool, input)),
      result,
    }

    notifyToolDecision(row.id, payload)

    return payload
  } catch (error) {
    const payload = {
      toolCallId: row.id,
      agentRunId: row.agentRunId,
      status: 'failed' as const,
      error: error instanceof Error ? error.message : String(error),
    }

    notifyToolDecision(row.id, payload)

    return payload
  }
}

export async function rejectToolCall(request: ToolRejectRequest): Promise<ToolInvokeResult> {
  const row = getToolCall(request.toolCallId)

  if (!row) {
    throw new Error('工具调用不存在')
  }

  if (row.status !== 'awaiting_approval') {
    throw new Error(`当前状态不可拒绝：${row.status}`)
  }

  const input = JSON.parse(row.inputJson) as Record<string, unknown>
  const previewPaths = extractPathsFromInput(row.toolName, input)

  updateToolCall(row.id, {
    status: 'rejected',
    result: { summary: request.reason ?? '用户已拒绝' },
    finishedAt: true,
  })

  insertAuditLog({
    action: row.toolName,
    toolCallId: row.id,
    affectedPaths: previewPaths,
    approvedByUser: false,
    result: 'rejected',
    error: request.reason ?? null,
  })

  finishAgentRun(row.agentRunId, 'cancelled')

  const payload = {
    toolCallId: row.id,
    agentRunId: row.agentRunId,
    status: 'rejected' as const,
    error: request.reason ?? '用户已拒绝',
  }

  notifyToolDecision(row.id, payload)

  return payload
}
