import test from 'node:test'
import assert from 'node:assert/strict'
import { shouldExcludePath } from '../../../../dist/main/services/indexer/exclude.js'

test('shouldExcludePath skips node_modules and ssh', () => {
  assert.equal(shouldExcludePath('/home/user/project/node_modules/pkg/index.js', []), true)
  assert.equal(shouldExcludePath('/home/user/.ssh/id_rsa', []), true)
  assert.equal(shouldExcludePath('/home/user/docs/readme.md', []), false)
})

test('shouldExcludePath honors user exclude patterns', () => {
  assert.equal(shouldExcludePath('/data/build/output.bin', ['**/build/**']), true)
})

test('shouldExcludePath skips isaacsim extscache', () => {
  assert.equal(
    shouldExcludePath(
      '/home/user/isaacsim/extscache/omni.graph.tutorials/foo.py',
      [],
    ),
    true,
  )
})
