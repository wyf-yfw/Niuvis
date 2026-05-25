import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

const DOCUMENT_EXTENSIONS = new Set([
  '.doc',
  '.docx',
  '.md',
  '.pdf',
  '.ppt',
  '.pptx',
  '.txt',
  '.xls',
  '.xlsx',
])
const IMAGE_EXTENSIONS = new Set(['.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'])
const INDEX_FILE = 'index.json'

export function getFileKind(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  if (DOCUMENT_EXTENSIONS.has(extension)) return 'document'
  if (IMAGE_EXTENSIONS.has(extension)) return 'image'

  return 'unknown'
}

function getDisplayType(filePath) {
  const extension = path.extname(filePath).replace('.', '').toUpperCase()

  if (!extension) return 'FILE'
  if (extension === 'JPG' || extension === 'JPEG') return 'JPG'

  return extension
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function getImageMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase()

  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.jpg' || extension === '.jpeg') return 'image/jpeg'
  if (extension === '.png') return 'image/png'
  if (extension === '.gif') return 'image/gif'
  if (extension === '.webp') return 'image/webp'
  if (extension === '.avif') return 'image/avif'

  return 'application/octet-stream'
}

async function getPreviewDataUrl(filePath) {
  if (getFileKind(filePath) !== 'image') return ''

  try {
    const buffer = await fs.readFile(filePath)
    return `data:${getImageMimeType(filePath)};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

function getKindDirectory(libraryRoot, kind) {
  return path.join(libraryRoot, kind)
}

function getIndexPath(libraryRoot, kind) {
  return path.join(getKindDirectory(libraryRoot, kind), INDEX_FILE)
}

async function readIndex(libraryRoot, kind) {
  try {
    const index = JSON.parse(await fs.readFile(getIndexPath(libraryRoot, kind), 'utf8'))
    return Array.isArray(index.items) ? index.items : []
  } catch {
    return []
  }
}

async function writeIndex(libraryRoot, kind, items) {
  const kindDirectory = getKindDirectory(libraryRoot, kind)

  await fs.mkdir(kindDirectory, { recursive: true })
  await fs.writeFile(
    getIndexPath(libraryRoot, kind),
    JSON.stringify(
      {
        version: 1,
        updatedAt: new Date().toISOString(),
        items,
      },
      null,
      2,
    ),
  )
}

function isAllowedForKind(filePath, kind) {
  const fileKind = getFileKind(filePath)

  if (kind === 'documents') return fileKind === 'document'
  if (kind === 'gallery') return fileKind === 'image'

  return false
}

async function createLibraryItem(libraryRoot, kind, sourcePath) {
  const stat = await fs.stat(sourcePath)
  const id = crypto.randomUUID()
  const extension = path.extname(sourcePath)
  const storedName = `${id}${extension}`
  const storedPath = path.join(getKindDirectory(libraryRoot, kind), 'files', storedName)

  await fs.mkdir(path.dirname(storedPath), { recursive: true })
  await fs.copyFile(sourcePath, storedPath)

  return {
    id,
    kind,
    name: path.basename(sourcePath),
    type: getDisplayType(sourcePath),
    size: formatBytes(stat.size),
    bytes: stat.size,
    addedAt: new Date().toISOString(),
    modifiedAt: stat.mtime.toISOString(),
    storedPath,
    previewDataUrl: kind === 'gallery' ? await getPreviewDataUrl(storedPath) : '',
  }
}

export async function listLibraryItems({ libraryRoot, kind }) {
  return readIndex(libraryRoot, kind)
}

export async function addLibraryFiles({ libraryRoot, kind, filePaths }) {
  const existingItems = await readIndex(libraryRoot, kind)
  const addedItems = []

  for (const filePath of filePaths) {
    if (!isAllowedForKind(filePath, kind)) continue

    try {
      addedItems.push(await createLibraryItem(libraryRoot, kind, filePath))
    } catch {
      // Keep importing remaining files if one file is unreadable.
    }
  }

  if (addedItems.length > 0) {
    await writeIndex(libraryRoot, kind, [...addedItems, ...existingItems])
  }

  return addedItems
}
