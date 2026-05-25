import test from 'node:test'
import assert from 'node:assert/strict'
import { openDatabaseAt, resetDatabaseForTests } from '../../../../dist/main/services/database/index.js'
import { listComputerIndexDirectory, upsertComputerIndexItem } from '../../../../dist/main/services/database/indexItems.js'

test('listComputerIndexDirectory lists roots and direct children from indexed paths only', () => {
  resetDatabaseForTests()
  const db = openDatabaseAt(':memory:')

    const roots = ['/home/demo']

    upsertComputerIndexItem(
      { kind: 'file', name: 'readme.md', path: '/home/demo/readme.md', modifiedAt: '2026-01-01' },
      db,
    )
    upsertComputerIndexItem(
      { kind: 'document', name: 'report.pdf', path: '/home/demo/docs/report.pdf', modifiedAt: '2026-01-02' },
      db,
    )
    upsertComputerIndexItem(
      { kind: 'image', name: 'photo.png', path: '/home/demo/photos/2026/photo.png', modifiedAt: '2026-01-03' },
      db,
    )

    const rootListing = listComputerIndexDirectory(null, roots, db)

    assert.equal(rootListing.path, null)
    assert.equal(rootListing.entries.length, 1)
    assert.equal(rootListing.entries[0].path, '/home/demo')
    assert.equal(rootListing.entries[0].isDirectory, true)

    const childListing = listComputerIndexDirectory('/home/demo', roots, db)

    assert.equal(childListing.path, '/home/demo')
    assert.equal(childListing.parentPath, null)

    const names = childListing.entries.map((entry) => entry.name).sort()

    assert.deepEqual(names, ['docs', 'photos', 'readme.md'])
    assert.equal(childListing.entries.find((entry) => entry.name === 'readme.md')?.isDirectory, false)
    assert.equal(childListing.entries.find((entry) => entry.name === 'docs')?.isDirectory, true)

  db.close()
  resetDatabaseForTests()
})
