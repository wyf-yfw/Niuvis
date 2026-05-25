import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

export function getFileType(name, isDirectory) {
  if (isDirectory) return '文件夹'

  const extension = path.extname(name).replace('.', '').toUpperCase()

  return extension || 'FILE'
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function createRoot(label, rootPath, type = 'drive') {
  return {
    id: rootPath,
    name: label,
    path: rootPath,
    type: '文件夹',
    sourceType: type,
    isDirectory: true,
  }
}

export async function listRoots({
  platform = process.platform,
  homedir = os.homedir,
} = {}) {
  if (platform === 'win32') {
    const roots = []

    for (let code = 65; code <= 90; code += 1) {
      const letter = String.fromCharCode(code)
      const drivePath = `${letter}:\\`

      if (await pathExists(drivePath)) {
        roots.push(createRoot(`${letter}:`, drivePath))
      }
    }

    return roots
  }

  const homePath = homedir()
  const roots = []

  if (homePath) roots.push(createRoot(path.basename(homePath) || homePath, homePath, 'home'))
  roots.push(createRoot('/', '/', 'drive'))

  return roots
}

export async function listDirectory(directoryPath, { showHidden = false } = {}) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true })
  const items = []

  for (const entry of entries) {
    if (!showHidden && entry.name.startsWith('.')) continue

    const itemPath = path.join(directoryPath, entry.name)

    try {
      const stat = await fs.stat(itemPath)
      const isDirectory = entry.isDirectory()

      items.push({
        id: itemPath,
        name: entry.name,
        path: itemPath,
        isDirectory,
        type: getFileType(entry.name, isDirectory),
        size: isDirectory ? '—' : formatBytes(stat.size),
        bytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      })
    } catch {
      // Skip unreadable entries so one permission issue does not break the folder.
    }
  }

  items.sort((a, b) => {
    if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1
    return a.name.localeCompare(b.name, 'zh-CN')
  })

  return {
    path: directoryPath,
    parentPath: path.dirname(directoryPath) === directoryPath ? '' : path.dirname(directoryPath),
    items,
  }
}
