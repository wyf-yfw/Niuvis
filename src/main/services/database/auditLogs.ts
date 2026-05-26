import { randomUUID } from 'node:crypto'
import { getDb } from './index.js'

export function insertAuditLog(options: {
  action: string
  toolCallId?: string
  affectedPaths?: string[]
  approvedByUser?: boolean | null
  result?: string
  error?: string | null
}) {
  const db = getDb()
  const id = randomUUID()

  db.prepare(
    `INSERT INTO audit_logs (
      id, action, tool_call_id, affected_paths_json, approved_by_user, result, error, created_at
    ) VALUES (
      @id, @action, @toolCallId, @affectedPathsJson, @approvedByUser, @result, @error, datetime('now')
    )`,
  ).run({
    id,
    action: options.action,
    toolCallId: options.toolCallId ?? null,
    affectedPathsJson: JSON.stringify(options.affectedPaths ?? []),
    approvedByUser:
      options.approvedByUser === undefined || options.approvedByUser === null
        ? null
        : options.approvedByUser
          ? 1
          : 0,
    result: options.result ?? null,
    error: options.error ?? null,
  })

  return id
}
