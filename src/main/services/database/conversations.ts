import { randomUUID } from 'node:crypto'
import type { ChatMessage, ConversationDetail, ConversationSummary } from '../../../shared/types/chat.js'
import { getDb } from './index.js'
import { packMessageContent, unpackMessageContent } from '../chat/messageCodec.js'

function mapConversation(row: Record<string, unknown>): ConversationSummary {
  return {
    id: String(row.id),
    title: String(row.title ?? ''),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    model: row.model == null ? null : String(row.model),
    pinned: Number(row.pinned) === 1,
    preview: row.preview == null ? undefined : String(row.preview),
  }
}

function mapMessage(row: Record<string, unknown>): ChatMessage {
  const { content, meta } = unpackMessageContent(String(row.content ?? ''))

  return {
    id: String(row.id),
    role: String(row.role) as ChatMessage['role'],
    content,
    meta,
    toolCallId: row.tool_call_id == null ? undefined : String(row.tool_call_id),
    createdAt: String(row.created_at),
  }
}

export function createConversation(title = '新对话', model: string | null = null) {
  const db = getDb()
  const id = randomUUID()
  const trimmedTitle = title.trim() || '新对话'

  db.prepare(
    `INSERT INTO conversations (id, title, model, pinned, created_at, updated_at)
     VALUES (@id, @title, @model, 0, datetime('now'), datetime('now'))`,
  ).run({ id, title: trimmedTitle, model })

  return getConversation(id)!
}

export function listConversations(limit = 50) {
  const rows = getDb()
    .prepare(
      `SELECT c.*,
              (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS preview
       FROM conversations c
       ORDER BY c.pinned DESC, c.updated_at DESC
       LIMIT ?`,
    )
    .all(limit) as Record<string, unknown>[]

  return rows.map((row) => {
    const conversation = mapConversation(row)

    if (row.preview) {
      conversation.preview = unpackMessageContent(String(row.preview)).content.slice(0, 120)
    }

    return conversation
  })
}

export function getConversation(conversationId: string): ConversationDetail | null {
  const row = getDb()
    .prepare(`SELECT * FROM conversations WHERE id = ?`)
    .get(conversationId) as Record<string, unknown> | undefined

  if (!row) return null

  const messages = getDb()
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    )
    .all(conversationId) as Record<string, unknown>[]

  return {
    ...mapConversation(row),
    messages: messages.map(mapMessage),
  }
}

export function updateConversation(
  conversationId: string,
  patch: { title?: string; pinned?: boolean; model?: string | null },
) {
  const fields: string[] = [`updated_at = datetime('now')`]
  const params: Record<string, unknown> = { id: conversationId }

  if (patch.title !== undefined) {
    fields.push('title = @title')
    params.title = patch.title
  }

  if (patch.pinned !== undefined) {
    fields.push('pinned = @pinned')
    params.pinned = patch.pinned ? 1 : 0
  }

  if (patch.model !== undefined) {
    fields.push('model = @model')
    params.model = patch.model
  }

  getDb()
    .prepare(`UPDATE conversations SET ${fields.join(', ')} WHERE id = @id`)
    .run(params)
}

export function deleteConversation(conversationId: string) {
  getDb().prepare(`DELETE FROM conversations WHERE id = ?`).run(conversationId)
}

export function searchConversations(query: string, limit = 20) {
  const pattern = `%${query.replace(/[%_]/g, '')}%`

  const rows = getDb()
    .prepare(
      `SELECT DISTINCT c.*
       FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.title LIKE @pattern OR m.content LIKE @pattern
       ORDER BY c.updated_at DESC
       LIMIT @limit`,
    )
    .all({ pattern, limit }) as Record<string, unknown>[]

  return rows.map(mapConversation)
}

export function insertMessage(options: {
  conversationId: string
  role: ChatMessage['role']
  content: string
  meta?: ChatMessage['meta']
  toolCallId?: string
  id?: string
}) {
  const db = getDb()
  const id = options.id ?? randomUUID()
  const packed = packMessageContent(options.content, options.meta)

  db.prepare(
    `INSERT INTO messages (id, conversation_id, role, content, tool_call_id, created_at)
     VALUES (@id, @conversationId, @role, @content, @toolCallId, datetime('now'))`,
  ).run({
    id,
    conversationId: options.conversationId,
    role: options.role,
    content: packed,
    toolCallId: options.toolCallId ?? null,
  })

  db.prepare(`UPDATE conversations SET updated_at = datetime('now') WHERE id = ?`).run(
    options.conversationId,
  )

  return id
}

export function listMessagesForModel(conversationId: string, maxTokens = 12000) {
  const rows = getDb()
    .prepare(
      `SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
    )
    .all(conversationId) as Record<string, unknown>[]

  const messages = rows.map(mapMessage)
  const selected: ChatMessage[] = []
  let tokens = 0

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    const estimate = Math.ceil(message.content.length / 4)

    if (tokens + estimate > maxTokens && selected.length > 0) {
      break
    }

    selected.unshift(message)
    tokens += estimate
  }

  return selected
}
