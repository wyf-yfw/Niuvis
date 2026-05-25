import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { readContentSnippet } from '../../../../dist/main/services/indexer/documents.js'

test('readContentSnippet extracts markdown text for FTS', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'niuvis-doc-snippet-'))
  const filePath = path.join(dir, 'recent-notes.md')

  fs.writeFileSync(filePath, '# 最近修改的 markdown 文件\n\n项目说明正文', 'utf8')

  try {
    const snippet = await readContentSnippet(filePath)
    assert.match(snippet, /markdown/)
    assert.match(snippet, /项目说明/)
  } finally {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})
