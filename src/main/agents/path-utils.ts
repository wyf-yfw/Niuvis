import path from 'node:path'

export function normalizePath(filePath: string) {
  return path.resolve(filePath)
}
