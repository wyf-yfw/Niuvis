import { randomUUID } from 'node:crypto'
import type Database from 'better-sqlite3'
import { getDb } from './index.js'

export interface ComputerIndexItemInput {
  kind: string
  name: string
  path: string
  mime?: string
  size?: number
  modifiedAt?: string
  source?: string
  permissionsJson?: string
  contentHash?: string
  contentSnippet?: string
}

export interface ComputerIndexItemRow extends ComputerIndexItemInput {
  id: string
}

function mapRow(row: Record<string, unknown>): ComputerIndexItemRow {
  return {
    id: String(row.id),
    kind: String(row.kind),
    name: String(row.name),
    path: String(row.path),
    mime: row.mime ? String(row.mime) : undefined,
    size: row.size == null ? undefined : Number(row.size),
    modifiedAt: row.modified_at ? String(row.modified_at) : undefined,
    source: row.source ? String(row.source) : undefined,
    permissionsJson: row.permissions_json ? String(row.permissions_json) : undefined,
    contentHash: row.content_hash ? String(row.content_hash) : undefined,
    contentSnippet: row.content_snippet ? String(row.content_snippet) : '',
  }
}

export function upsertComputerIndexItem(
  input: ComputerIndexItemInput,
  db: Database.Database = getDb(),
): ComputerIndexItemRow {
  const existing = db
    .prepare(`SELECT id FROM computer_index_items WHERE path = ?`)
    .get(input.path) as { id: string } | undefined

  const id = existing?.id ?? randomUUID()

  db.prepare(
    `INSERT INTO computer_index_items (
      id, kind, name, path, mime, size, modified_at, source, permissions_json, content_hash, content_snippet
    ) VALUES (
      @id, @kind, @name, @path, @mime, @size, @modifiedAt, @source, @permissionsJson, @contentHash, @contentSnippet
    )
    ON CONFLICT(path) DO UPDATE SET
      kind = excluded.kind,
      name = excluded.name,
      mime = excluded.mime,
      size = excluded.size,
      modified_at = excluded.modified_at,
      source = excluded.source,
      permissions_json = excluded.permissions_json,
      content_hash = excluded.content_hash,
      content_snippet = excluded.content_snippet`,
  ).run({
    id,
    kind: input.kind,
    name: input.name,
    path: input.path,
    mime: input.mime ?? null,
    size: input.size ?? null,
    modifiedAt: input.modifiedAt ?? null,
    source: input.source ?? null,
    permissionsJson: input.permissionsJson ?? null,
    contentHash: input.contentHash ?? null,
    contentSnippet: input.contentSnippet ?? '',
  })

  const row = db.prepare(`SELECT * FROM computer_index_items WHERE id = ?`).get(id) as Record<string, unknown>

  return mapRow(row)
}

export function searchComputerIndexFts(query: string, limit = 20, db: Database.Database = getDb()) {
  const sanitized = query.trim().replace(/[^\p{L}\p{N}\s./_-]/gu, ' ')

  if (!sanitized) {
    return []
  }

  const ftsQuery = sanitized
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term}"*`)
    .join(' ')

  const rows = db
    .prepare(
      `SELECT i.*
       FROM computer_index_fts f
       JOIN computer_index_items i ON i.rowid = f.rowid
       WHERE computer_index_fts MATCH ?
       ORDER BY rank
       LIMIT ?`,
    )
    .all(ftsQuery, limit) as Record<string, unknown>[]

  return rows.map(mapRow)
}
