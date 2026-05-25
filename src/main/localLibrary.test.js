import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  addLibraryFiles,
  getFileKind,
  listLibraryItems,
} from './localLibrary.js'

test('getFileKind classifies documents and images', () => {
  assert.equal(getFileKind('/tmp/report.pdf'), 'document')
  assert.equal(getFileKind('/tmp/photo.png'), 'image')
  assert.equal(getFileKind('/tmp/archive.zip'), 'unknown')
})

test('addLibraryFiles copies documents and persists index', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-library-'))
  const sourceDir = path.join(root, 'source')
  const libraryRoot = path.join(root, 'library')
  const sourcePath = path.join(sourceDir, 'report.pdf')

  await mkdir(sourceDir, { recursive: true })
  await writeFile(sourcePath, 'pdf-content')

  try {
    const added = await addLibraryFiles({
      libraryRoot,
      kind: 'documents',
      filePaths: [sourcePath],
    })
    const listed = await listLibraryItems({ libraryRoot, kind: 'documents' })

    assert.equal(added.length, 1)
    assert.equal(added[0].name, 'report.pdf')
    assert.equal(added[0].type, 'PDF')
    assert.equal(added[0].kind, 'documents')
    assert.equal(await readFile(added[0].storedPath, 'utf8'), 'pdf-content')
    assert.deepEqual(listed.map((item) => item.id), [added[0].id])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('addLibraryFiles copies images and creates preview data urls', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-gallery-'))
  const sourceDir = path.join(root, 'source')
  const libraryRoot = path.join(root, 'library')
  const sourcePath = path.join(sourceDir, 'photo.png')
  const pngHeader = Buffer.from('89504e470d0a1a0a', 'hex')

  await mkdir(sourceDir, { recursive: true })
  await writeFile(sourcePath, pngHeader)

  try {
    const [item] = await addLibraryFiles({
      libraryRoot,
      kind: 'gallery',
      filePaths: [sourcePath],
    })

    assert.equal(item.kind, 'gallery')
    assert.equal(item.type, 'PNG')
    assert.match(item.previewDataUrl, /^data:image\/png;base64,/)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('addLibraryFiles ignores unsupported file types', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-library-unsupported-'))
  const sourcePath = path.join(root, 'archive.zip')

  await writeFile(sourcePath, 'zip')

  try {
    const added = await addLibraryFiles({
      libraryRoot: path.join(root, 'library'),
      kind: 'documents',
      filePaths: [sourcePath],
    })

    assert.deepEqual(added, [])
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})
