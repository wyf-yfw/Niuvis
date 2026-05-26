import { randomUUID } from 'node:crypto'
import type { ToolCallStatus, ToolRiskLevel } from '../../../shared/types/tools.js'
import { getDb } from './index.js'

export interface ToolCallRow {
  id: string
  agentRunId: string
  toolName: string
  inputJson: string
  riskLevel: ToolRiskLevel
  requiresConfirmation: number
  status: ToolCallStatus
  resultJson: string | null
  startedAt: string
  finishedAt: string | null
}

function mapRow(row: Record<string, unknown>): ToolCallRow {
  return {
    id: String(row.id),
    agentRunId: String(row.agent_run_id),
    toolName: String(row.tool_name),
    inputJson: String(row.input_json ?? '{}'),
    riskLevel: String(row.risk_level) as ToolRiskLevel,
    requiresConfirmation: Number(row.requires_confirmation ?? 0),
    status: String(row.status) as ToolCallStatus,
    resultJson: row.result_json == null ? null : String(row.result_json),
    startedAt: String(row.started_at),
    finishedAt: row.finished_at == null ? null : String(row.finished_at),
  }
}

export function insertToolCall(options: {
  id?: string
  agentRunId: string
  toolName: string
  input: unknown
  riskLevel: ToolRiskLevel
  requiresConfirmation: boolean
  status?: ToolCallStatus
}) {
  const db = getDb()
  const id = options.id ?? randomUUID()

  db.prepare(
    `INSERT INTO tool_calls (
      id, agent_run_id, tool_name, input_json, risk_level, requires_confirmation, status, started_at
    ) VALUES (
      @id, @agentRunId, @toolName, @inputJson, @riskLevel, @requiresConfirmation, @status, datetime('now')
    )`,
  ).run({
    id,
    agentRunId: options.agentRunId,
    toolName: options.toolName,
    inputJson: JSON.stringify(options.input ?? {}),
    riskLevel: options.riskLevel,
    requiresConfirmation: options.requiresConfirmation ? 1 : 0,
    status: options.status ?? 'pending',
  })

  return id
}

export function updateToolCall(
  toolCallId: string,
  patch: {
    status?: ToolCallStatus
    result?: unknown
    finishedAt?: boolean
  },
) {
  const db = getDb()
  const fields: string[] = []
  const params: Record<string, unknown> = { id: toolCallId }

  if (patch.status) {
    fields.push('status = @status')
    params.status = patch.status
  }

  if (patch.result !== undefined) {
    fields.push('result_json = @resultJson')
    params.resultJson = JSON.stringify(patch.result)
  }

  if (patch.finishedAt) {
    fields.push(`finished_at = datetime('now')`)
  }

  if (fields.length === 0) {
    return
  }

  db.prepare(`UPDATE tool_calls SET ${fields.join(', ')} WHERE id = @id`).run(params)
}

export function getToolCall(toolCallId: string) {
  const row = getDb()
    .prepare(`SELECT * FROM tool_calls WHERE id = ?`)
    .get(toolCallId) as Record<string, unknown> | undefined

  return row ? mapRow(row) : null
}

export function listPendingToolCalls(limit = 20) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM tool_calls
       WHERE status = 'awaiting_approval'
       ORDER BY started_at ASC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[]

  return rows.map(mapRow)
}
