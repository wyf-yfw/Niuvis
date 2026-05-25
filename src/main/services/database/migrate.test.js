import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { openDatabaseAt, resetDatabaseForTests } from '../../../../dist/main/services/database/index.js'
import { MIGRATION_FILES, runMigrations } from '../../../../dist/main/services/database/migrate.js'

test('runMigrations applies 001_initial on empty database', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'niuvis-db-'))
  const dbPath = path.join(tempDir, 'test.db')

  try {
    const db = openDatabaseAt(dbPath)
    const version = db.pragma('user_version', { simple: true })

    assert.equal(version, MIGRATION_FILES.length)

    const row = db
      .prepare(`SELECT value FROM schema_info WHERE key = 'initialized_at'`)
      .get()

    assert.ok(row?.value)
  } finally {
    resetDatabaseForTests()
    fs.rmSync(tempDir, { recursive: true, force: true })
  }
})

test('runMigrations is idempotent when already at latest version', async () => {
  const Database = (await import('better-sqlite3')).default
  const db = new Database(':memory:')

  try {
    const first = runMigrations(db)
    const second = runMigrations(db)

    assert.deepEqual(first.applied, [...MIGRATION_FILES])
    assert.equal(second.applied.length, 0)
    assert.equal(second.from, MIGRATION_FILES.length)
    assert.equal(second.to, MIGRATION_FILES.length)
  } finally {
    db.close()
  }
})
