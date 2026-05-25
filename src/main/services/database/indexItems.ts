import { randomUUID } from 'node:crypto'
import path from 'node:path'
import type Database from 'better-sqlite3'
import { getDb } from './index.js'
import type { IndexDirectoryEntry, IndexDirectoryListing } from '../../../shared/types/computerIndex.js'

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

export function deleteComputerIndexItemByPath(path: string, db: Database.Database = getDb()) {
  db.prepare(`DELETE FROM computer_index_items WHERE path = ?`).run(path)
}

export function countComputerIndexItems(kind?: string, db: Database.Database = getDb()) {
  if (kind) {
    const row = db
      .prepare(`SELECT COUNT(*) AS count FROM computer_index_items WHERE kind = ?`)
      .get(kind) as { count: number }

    return row.count
  }

  const row = db.prepare(`SELECT COUNT(*) AS count FROM computer_index_items`).get() as { count: number }

  return row.count
}

export function listComputerIndexItems(
  options: { kind?: string; limit?: number; offset?: number } = {},
  db: Database.Database = getDb(),
): ComputerIndexItemRow[] {
  const limit = options.limit ?? 500
  const offset = options.offset ?? 0

  if (options.kind) {
    const rows = db
      .prepare(
        `SELECT * FROM computer_index_items
         WHERE kind = ?
         ORDER BY modified_at DESC, name ASC
         LIMIT ? OFFSET ?`,
      )
      .all(options.kind, limit, offset) as Record<string, unknown>[]

    return rows.map(mapRow)
  }

  const rows = db
    .prepare(
      `SELECT * FROM computer_index_items
       ORDER BY modified_at DESC, name ASC
       LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as Record<string, unknown>[]

  return rows.map(mapRow)
}

export interface IndexSearchOptions {
  query: string
  kind?: string
  limit?: number
  offset?: number
}

export interface IndexSearchRow extends ComputerIndexItemRow {
  highlight?: string
  rank?: number
}

function buildFtsQuery(query: string) {
  const sanitized = query.trim().replace(/[^\p{L}\p{N}\s./_\\-]/gu, ' ')

  if (!sanitized) {
    return ''
  }

  return sanitized
    .split(/\s+/)
    .filter(Boolean)
    .map((term) => `"${term}"*`)
    .join(' ')
}

function hasCjk(text: string) {
  return /[\u4e00-\u9fff]/.test(text)
}

function searchByPathLike(query: string, kind: string | undefined, limit: number, offset: number, db: Database.Database) {
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const kindClause = kind ? `AND kind = @kind` : ''

  const rows = db
    .prepare(
      `SELECT * FROM computer_index_items
       WHERE (path LIKE @pattern OR name LIKE @pattern) ${kindClause}
       ORDER BY modified_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ pattern, kind: kind ?? null, limit, offset }) as Record<string, unknown>[]

  return rows.map((row) => ({ ...mapRow(row), highlight: undefined, rank: undefined }))
}

function searchByLike(query: string, kind: string | undefined, limit: number, offset: number, db: Database.Database) {
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const kindClause = kind ? `AND i.kind = @kind` : ''

  const rows = db
    .prepare(
      `SELECT i.* FROM computer_index_items i
       WHERE (i.name LIKE @pattern OR i.path LIKE @pattern OR i.content_snippet LIKE @pattern) ${kindClause}
       ORDER BY i.modified_at DESC
       LIMIT @limit OFFSET @offset`,
    )
    .all({ pattern, kind: kind ?? null, limit, offset }) as Record<string, unknown>[]

  return rows.map((row) => ({ ...mapRow(row), highlight: undefined, rank: undefined }))
}

function countPathLike(query: string, kind: string | undefined, db: Database.Database) {
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const kindClause = kind ? `AND kind = @kind` : ''

  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM computer_index_items
       WHERE (path LIKE @pattern OR name LIKE @pattern) ${kindClause}`,
    )
    .get({ pattern, kind: kind ?? null }) as { count: number }

  return row.count
}

function countLike(query: string, kind: string | undefined, db: Database.Database) {
  const pattern = `%${query.replace(/[%_]/g, '')}%`
  const kindClause = kind ? `AND kind = @kind` : ''

  const row = db
    .prepare(
      `SELECT COUNT(*) AS count FROM computer_index_items
       WHERE (name LIKE @pattern OR path LIKE @pattern OR content_snippet LIKE @pattern) ${kindClause}`,
    )
    .get({ pattern, kind: kind ?? null }) as { count: number }

  return row.count
}

export function searchComputerIndex(
  options: IndexSearchOptions,
  db: Database.Database = getDb(),
): { items: IndexSearchRow[]; total: number; tookMs: number } {
  const started = Date.now()
  const query = options.query.trim()
  const limit = options.limit ?? 30
  const offset = options.offset ?? 0
  const kind = options.kind

  if (!query) {
    return { items: [], total: 0, tookMs: Date.now() - started }
  }

  const isPathQuery = /[\\/]/.test(query) || query.startsWith('~')

  if (isPathQuery) {
    const items = searchByPathLike(query, kind, limit, offset, db)
    const total = countPathLike(query, kind, db)

    return { items, total, tookMs: Date.now() - started }
  }

  if (hasCjk(query)) {
    const items = searchByLike(query, kind, limit, offset, db)
    const total = countLike(query, kind, db)

    return { items, total, tookMs: Date.now() - started }
  }

  const ftsQuery = buildFtsQuery(query)

  if (ftsQuery) {
    try {
      const kindClause = kind ? `AND i.kind = @kind` : ''
      const rows = db
        .prepare(
          `SELECT i.*,
                  snippet(computer_index_fts, 2, '<mark>', '</mark>', '…', 32) AS highlight,
                  rank
           FROM computer_index_fts f
           JOIN computer_index_items i ON i.rowid = f.rowid
           WHERE computer_index_fts MATCH @ftsQuery ${kindClause}
           ORDER BY rank
           LIMIT @limit OFFSET @offset`,
        )
        .all({ ftsQuery, kind: kind ?? null, limit, offset }) as Record<string, unknown>[]

      if (rows.length > 0 || !hasCjk(query)) {
        const countRow = db
          .prepare(
            `SELECT COUNT(*) AS count
             FROM computer_index_fts f
             JOIN computer_index_items i ON i.rowid = f.rowid
             WHERE computer_index_fts MATCH @ftsQuery ${kindClause}`,
          )
          .get({ ftsQuery, kind: kind ?? null }) as { count: number }

        const items = rows.map((row) => ({
          ...mapRow(row),
          highlight: row.highlight ? String(row.highlight) : undefined,
          rank: row.rank == null ? undefined : Number(row.rank),
        }))

        return { items, total: countRow.count, tookMs: Date.now() - started }
      }
    } catch {
      // FTS 语法无效时走 LIKE 兜底
    }
  }

  const items = searchByLike(query, kind, limit, offset, db)
  const total = countLike(query, kind, db)

  return { items, total, tookMs: Date.now() - started }
}

function escapeLikePattern(value: string) {
  return value.replace(/[%_\\]/g, '\\$&')
}

function normalizeDirectoryPath(directoryPath: string) {
  const resolved = path.resolve(directoryPath)

  if (resolved === '/') {
    return resolved
  }

  return resolved.replace(/[/\\]+$/, '')
}

/** 列出索引内某目录的直接子项（文件夹为虚拟节点，仅当该路径下有已索引后代时出现） */
export function listComputerIndexDirectory(
  directoryPath: string | null,
  rootPaths: string[],
  db: Database.Database = getDb(),
): IndexDirectoryListing {
  if (directoryPath == null || directoryPath === '') {
    const entries: IndexDirectoryEntry[] = rootPaths.map((root) => {
      const normalized = normalizeDirectoryPath(root)

      return {
        name: path.basename(normalized) || normalized,
        path: normalized,
        isDirectory: true,
      }
    })

    return {
      path: null,
      parentPath: null,
      entries: entries.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    }
  }

  const parentPath = normalizeDirectoryPath(directoryPath)
  const prefix = `${parentPath}${path.sep}`
  const likePattern = `${escapeLikePattern(prefix)}%`

  const rows = db
    .prepare(
      `SELECT path, kind, name, size, modified_at AS modifiedAt
       FROM computer_index_items
       WHERE path LIKE ? ESCAPE '\\'
       ORDER BY path ASC`,
    )
    .all(likePattern) as Array<{
    path: string
    kind: string
    name: string
    size: number | null
    modifiedAt: string | null
  }>

  const children = new Map<string, IndexDirectoryEntry>()

  for (const row of rows) {
    if (row.path === parentPath) {
      continue
    }

    const relative = row.path.startsWith(prefix) ? row.path.slice(prefix.length) : row.path.slice(parentPath.length + 1)
    const segments = relative.split(/[/\\]/).filter(Boolean)

    if (segments.length === 0) {
      continue
    }

    if (segments.length === 1) {
      children.set(row.path, {
        name: row.name,
        path: row.path,
        isDirectory: false,
        kind: row.kind as IndexDirectoryEntry['kind'],
        size: row.size ?? undefined,
        modifiedAt: row.modifiedAt ?? undefined,
      })
      continue
    }

    const folderPath = path.join(parentPath, segments[0])

    if (!children.has(folderPath)) {
      children.set(folderPath, {
        name: segments[0],
        path: folderPath,
        isDirectory: true,
      })
    }
  }

  const entries = [...children.values()].sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) {
      return a.isDirectory ? -1 : 1
    }

    return a.name.localeCompare(b.name, 'zh-CN')
  })

  const normalizedRoots = rootPaths.map((root) => normalizeDirectoryPath(root))
  const isConfiguredRoot = normalizedRoots.includes(parentPath)

  let parentOfParent: string | null = null

  if (!isConfiguredRoot) {
    const parentSegments = parentPath.split(/[/\\]/).filter(Boolean)

    if (parentPath !== '/' && parentSegments.length > 0) {
      parentOfParent =
        parentPath.startsWith('/') && parentSegments.length === 1
          ? '/'
          : parentPath.startsWith('/')
            ? `/${parentSegments.slice(0, -1).join('/')}`
            : path.join(...parentSegments.slice(0, -1))
    }

    if (parentOfParent && normalizedRoots.includes(parentOfParent)) {
      parentOfParent = null
    }
  }

  return {
    path: parentPath,
    parentPath: parentOfParent,
    entries,
  }
}
