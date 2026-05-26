import path from 'node:path'
import type { ToolRiskLevel } from '../../shared/types/tools.js'
import type { PermissionSettings } from '../../shared/types/settings.js'
import { normalizePath } from './path-utils.js'
import { shouldExcludePath } from '../services/indexer/exclude.js'
import { loadAppSettings } from '../services/settings/store.js'

export { normalizePath }

const SENSITIVE_HOME_SEGMENTS = [
  '.ssh',
  '.gnupg',
  '.aws',
  '.password-store',
  'keychains',
]

export function extractPathsFromInput(toolName: string, input: Record<string, unknown>): string[] {
  const paths: string[] = []

  const maybePath = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) {
      paths.push(value.trim())
    }
  }

  maybePath(input.path)
  maybePath(input.sourcePath)
  maybePath(input.destinationPath)
  maybePath(input.targetPath)
  maybePath(input.from)
  maybePath(input.to)

  if (toolName === 'rename_file' || toolName === 'move_file') {
    maybePath(input.newPath)
  }

  return paths.map(normalizePath)
}

export function isSensitivePath(filePath: string) {
  const normalized = normalizePath(filePath)
  const lower = normalized.toLowerCase()

  for (const segment of SENSITIVE_HOME_SEGMENTS) {
    if (lower.includes(`${path.sep}${segment}${path.sep}`) || lower.endsWith(`${path.sep}${segment}`)) {
      return true
    }
  }

  const settings = loadAppSettings()

  return shouldExcludePath(normalized, settings.index.excludePaths)
}

export function isPathWithinAllowedRoots(filePath: string) {
  const settings = loadAppSettings()
  const normalized = normalizePath(filePath)
  const roots = settings.index.rootPaths.map(normalizePath)

  if (roots.length === 0) {
    return true
  }

  return roots.some((root) => normalized === root || normalized.startsWith(`${root}${path.sep}`))
}

export function assertPathsAllowed(toolName: string, input: Record<string, unknown>) {
  const paths = extractPathsFromInput(toolName, input)

  for (const filePath of paths) {
    if (isSensitivePath(filePath)) {
      throw new Error(`路径受保护，禁止访问：${filePath}`)
    }

    if (!isPathWithinAllowedRoots(filePath)) {
      throw new Error(`路径不在允许的索引范围内：${filePath}`)
    }
  }
}

export function requiresConfirmationForTool(
  toolName: string,
  riskLevel: ToolRiskLevel,
  input: Record<string, unknown>,
  toolRequiresConfirmation: boolean,
  permissions: PermissionSettings = loadAppSettings().permissions,
): boolean {
  if (toolRequiresConfirmation) {
    return true
  }

  const paths = extractPathsFromInput(toolName, input)

  if (permissions.confirmSensitivePaths && paths.some(isSensitivePath)) {
    return true
  }

  if (toolName === 'delete_file' && permissions.confirmDelete) {
    return true
  }

  if ((toolName === 'move_file' || toolName === 'rename_file') && permissions.confirmMove) {
    return true
  }

  if (toolName === 'create_file' && permissions.confirmOverwrite) {
    return true
  }

  if (riskLevel === 'high') {
    return true
  }

  return false
}
