import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type Database from 'better-sqlite3'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const MIGRATION_FILES = ['001_initial.sql', '002_schema_v1.sql'] as const

export function getMigrationsDirectory() {
  return path.join(__dirname, 'migrations')
}

export function readMigrationSql(filename: string) {
  return fs.readFileSync(path.join(getMigrationsDirectory(), filename), 'utf8')
}

export function runMigrations(db: Database.Database) {
  const currentVersion = db.pragma('user_version', { simple: true }) as number
  const targetVersion = MIGRATION_FILES.length

  if (currentVersion >= targetVersion) {
    return { from: currentVersion, to: currentVersion, applied: [] as string[] }
  }

  const applied: string[] = []

  for (let index = currentVersion; index < targetVersion; index += 1) {
    const filename = MIGRATION_FILES[index]

    if (!filename) {
      throw new Error(`缺少迁移文件：版本 ${index + 1}`)
    }

    const sql = readMigrationSql(filename)

    db.exec(sql)
    db.pragma(`user_version = ${index + 1}`)
    applied.push(filename)
  }

  return {
    from: currentVersion,
    to: targetVersion,
    applied,
  }
}
