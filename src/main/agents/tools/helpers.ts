import fs from 'node:fs/promises'
import path from 'node:path'
import type { ToolPreview } from '../../../shared/types/tools.js'
import { normalizePath } from '../path-utils.js'

export function previewForPaths(summary: string, paths: string[], extra?: Partial<ToolPreview>): ToolPreview {
  return {
    summary,
    affectedPaths: paths.map(normalizePath),
    ...extra,
  }
}

export async function backupFileIfExists(filePath: string) {
  try {
    await fs.access(filePath)
  } catch {
    return null
  }

  const { app } = await import('electron')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.join(app.getPath('userData'), 'backups', stamp)
  const backupPath = path.join(backupDir, path.basename(filePath))

  await fs.mkdir(backupDir, { recursive: true })
  await fs.copyFile(filePath, backupPath)

  return backupPath
}
