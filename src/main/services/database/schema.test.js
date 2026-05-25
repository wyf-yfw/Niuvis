import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { openDatabaseAt, resetDatabaseForTests } from '../../../../dist/main/services/database/index.js'
import {
  searchComputerIndexFts,
  upsertComputerIndexItem,
} from '../../../../dist/main/services/database/indexItems.js'
import { MIGRATION_FILES } from '../../../../dist/main/services/database/migrate.js'

test('schema v1 migration creates core tables and fts', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niuvis-schema-'))
  const dbPath = path.join(tempDir, 'schema.db')

  try {
    const db = openDatabaseAt(dbPath)
    const version = db.pragma('user_version', { simple: true })

    assert.equal(version, MIGRATION_FILES.length)

    const tables = db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name`,
      )
      .all()
      .map((row) => row.name)

    assert.ok(tables.includes('conversations'))
    assert.ok(tables.includes('messages'))
    assert.ok(tables.includes('computer_index_items'))
    assert.ok(tables.includes('settings'))

    const fts = db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'computer_index_fts'`)
      .get()

    assert.ok(fts)
  } finally {
    resetDatabaseForTests()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('upsertComputerIndexItem syncs fts search results', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niuvis-schema-'))
  const dbPath = path.join(tempDir, 'fts.db')

  try {
    const db = openDatabaseAt(dbPath)

    upsertComputerIndexItem(
      {
        kind: 'file',
        name: 'budget-plan.md',
        path: '/tmp/budget-plan.md',
        contentSnippet: 'quarterly budget analysis',
      },
      db,
    )

    upsertComputerIndexItem(
      {
        kind: 'file',
        name: 'notes.txt',
        path: '/tmp/notes.txt',
        contentSnippet: 'random thoughts',
      },
      db,
    )

    const results = searchComputerIndexFts('budget', 10, db)

    assert.equal(results.length, 1)
    assert.equal(results[0].name, 'budget-plan.md')

    const updated = upsertComputerIndexItem(
      {
        kind: 'file',
        name: 'budget-plan.md',
        path: '/tmp/budget-plan.md',
        contentSnippet: 'updated budget notes',
      },
      db,
    )

    assert.equal(updated.path, '/tmp/budget-plan.md')

    const afterUpdate = searchComputerIndexFts('updated', 10, db)

    assert.equal(afterUpdate.length, 1)
  } finally {
    resetDatabaseForTests()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})
