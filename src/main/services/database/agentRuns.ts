import { randomUUID } from 'node:crypto'
import { getDb } from './index.js'

export function createAgentRun(options: { conversationId?: string; userRequest?: string } = {}) {
  const db = getDb()
  const id = randomUUID()
  const userRequest = options.userRequest ?? ''

  db.prepare(
    `INSERT INTO agent_runs (id, conversation_id, user_request, status, started_at)
     VALUES (@id, @conversationId, @userRequest, 'running', datetime('now'))`,
  ).run({
    id,
    conversationId: options.conversationId ?? null,
    userRequest,
  })

  return id
}

export function finishAgentRun(agentRunId: string, status: 'completed' | 'failed' | 'cancelled') {
  getDb()
    .prepare(
      `UPDATE agent_runs SET status = @status, finished_at = datetime('now') WHERE id = @id`,
    )
    .run({ id: agentRunId, status })
}
