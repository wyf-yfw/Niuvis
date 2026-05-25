import test from 'node:test'
import assert from 'node:assert/strict'
import { openDatabaseAt, resetDatabaseForTests } from '../../../../dist/main/services/database/index.js'
import { searchComputerIndex, upsertComputerIndexItem } from '../../../../dist/main/services/database/indexItems.js'

test(
  'searchComputerIndex P95 stays under 50ms with 100k indexed rows',
  { timeout: 180_000 },
  () => {
    resetDatabaseForTests()
    const db = openDatabaseAt(':memory:')

    const insert = db.prepare(
      `INSERT INTO computer_index_items (
        id, kind, name, path, mime, size, modified_at, source, content_snippet
      ) VALUES (?, 'file', ?, ?, 'text/plain', 10, datetime('now'), 'test', ?)`,
    )

    const insertMany = db.transaction((rows) => {
      for (const row of rows) {
        insert.run(row.id, row.name, row.path, row.snippet)
      }
    })

    const batchSize = 5000

    for (let batch = 0; batch < 20; batch += 1) {
      const rows = Array.from({ length: batchSize }, (_, index) => {
        const id = batch * batchSize + index
        return {
          id: `id-${id}`,
          name: `report-${id % 400}.md`,
          path: `/data/projects/p${id % 120}/report-${id}.md`,
          snippet: `markdown python workspace item ${id % 97}`,
        }
      })

      insertMany(rows)
    }

    db.exec(`INSERT INTO computer_index_fts(computer_index_fts) VALUES('rebuild')`)

    const queries = ['markdown', 'python', 'workspace', 'report-12', 'pdf', 'vscode', 'data']

    const durations = []

    for (let round = 0; round < 40; round += 1) {
      const query = `${queries[round % queries.length]} ${round}`
      const started = Date.now()
      const result = searchComputerIndex({ query, limit: 30 }, db)

      durations.push(Date.now() - started)
      assert.ok(result.items.length >= 0)
    }

    durations.sort((a, b) => a - b)
    const p95 = durations[Math.floor(durations.length * 0.95)] ?? durations.at(-1) ?? 0

    db.close()
    resetDatabaseForTests()

    assert.ok(p95 < 50, `expected P95 < 50ms, got ${p95}ms`)
  },
)
