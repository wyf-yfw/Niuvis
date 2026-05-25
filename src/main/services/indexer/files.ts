import fs from 'node:fs/promises'
import path from 'node:path'
import type { IndexSettings } from '../../../shared/types/settings.js'
import { upsertComputerIndexItem, deleteComputerIndexItemByPath } from '../database/indexItems.js'
import { shouldExcludePath, shouldExcludeDirectoryName } from './exclude.js'
import { classifyIndexKind, guessMime, readContentSnippet } from './documents.js'

const MAX_FILES_PER_SCAN = 80_000
const MAX_DIRECTORY_DEPTH = 14

export interface FileIndexStats {
  indexed: number
  skipped: number
}

async function indexFileAtPath(filePath: string) {
  const stat = await fs.stat(filePath)
  const kind = classifyIndexKind(filePath)
  const snippet = kind === 'document' ? await readContentSnippet(filePath) : ''

  upsertComputerIndexItem({
    kind,
    name: path.basename(filePath),
    path: filePath,
    mime: guessMime(filePath),
    size: stat.size,
    modifiedAt: stat.mtime.toISOString(),
    source: 'filesystem',
    contentSnippet: snippet,
  })
}

async function walkDirectory(
  directoryPath: string,
  settings: IndexSettings,
  depth: number,
  stats: FileIndexStats,
) {
  if (depth > MAX_DIRECTORY_DEPTH || stats.indexed >= MAX_FILES_PER_SCAN) {
    return
  }

  if (shouldExcludePath(directoryPath, settings.excludePaths)) {
    stats.skipped += 1
    return
  }

  let entries

  try {
    entries = await fs.readdir(directoryPath, { withFileTypes: true })
  } catch {
    stats.skipped += 1
    return
  }

  for (const entry of entries) {
    if (stats.indexed >= MAX_FILES_PER_SCAN) {
      return
    }

    const entryPath = path.join(directoryPath, entry.name)

    if (shouldExcludePath(entryPath, settings.excludePaths)) {
      stats.skipped += 1
      continue
    }

    if (entry.isDirectory()) {
      if (shouldExcludeDirectoryName(entry.name)) {
        stats.skipped += 1
        continue
      }

      await walkDirectory(entryPath, settings, depth + 1, stats)
      continue
    }

    if (!entry.isFile()) {
      continue
    }

    try {
      await indexFileAtPath(entryPath)
      stats.indexed += 1
    } catch {
      stats.skipped += 1
    }
  }
}

export async function indexFilesystem(settings: IndexSettings) {
  const stats: FileIndexStats = { indexed: 0, skipped: 0 }

  for (const rootPath of settings.rootPaths) {
    if (stats.indexed >= MAX_FILES_PER_SCAN) {
      break
    }

    if (shouldExcludePath(rootPath, settings.excludePaths)) {
      continue
    }

    try {
      const stat = await fs.stat(rootPath)

      if (stat.isFile()) {
        await indexFileAtPath(rootPath)
        stats.indexed += 1
        continue
      }
    } catch {
      stats.skipped += 1
      continue
    }

    await walkDirectory(rootPath, settings, 0, stats)
  }

  return stats
}

export async function indexSinglePath(targetPath: string, settings: IndexSettings) {
  if (shouldExcludePath(targetPath, settings.excludePaths)) {
    deleteComputerIndexItemByPath(targetPath)
    return
  }

  try {
    const stat = await fs.stat(targetPath)

    if (stat.isDirectory()) {
      return
    }

    if (!stat.isFile()) {
      deleteComputerIndexItemByPath(targetPath)
      return
    }

    await indexFileAtPath(targetPath)
  } catch {
    deleteComputerIndexItemByPath(targetPath)
  }
}

export function removeIndexedPath(targetPath: string) {
  deleteComputerIndexItemByPath(targetPath)
}
