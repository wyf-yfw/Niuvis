import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  formatBytes,
  getFileType,
  listDirectory,
  listRoots,
} from './fileBrowser.js'

test('formatBytes formats common sizes', () => {
  assert.equal(formatBytes(512), '512 B')
  assert.equal(formatBytes(1536), '1.5 KB')
  assert.equal(formatBytes(2 * 1024 * 1024), '2.0 MB')
})

test('getFileType returns folder and extension labels', () => {
  assert.equal(getFileType('Report.PDF', false), 'PDF')
  assert.equal(getFileType('Downloads', true), '文件夹')
  assert.equal(getFileType('Makefile', false), 'FILE')
})

test('listDirectory returns folders first and hides dotfiles by default', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-browser-'))
  const folderPath = path.join(root, 'folder')
  const filePath = path.join(root, 'note.txt')
  const hiddenPath = path.join(root, '.hidden')

  await mkdir(folderPath)
  await writeFile(filePath, 'hello')
  await writeFile(hiddenPath, 'hidden')

  try {
    const result = await listDirectory(root)

    assert.equal(result.path, root)
    assert.deepEqual(result.items.map((item) => item.name), ['folder', 'note.txt'])
    assert.equal(result.items[0].isDirectory, true)
    assert.equal(result.items[1].type, 'TXT')
    assert.equal(result.items[1].size, '5 B')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('listRoots includes home directory on linux-like platforms', async () => {
  const roots = await listRoots({ platform: 'linux', homedir: () => '/home/tester' })

  assert.deepEqual(
    roots.map((root) => ({ name: root.name, path: root.path, type: root.type })),
    [
      { name: 'tester', path: '/home/tester', type: '文件夹' },
      { name: '/', path: '/', type: '文件夹' },
    ],
  )
})
