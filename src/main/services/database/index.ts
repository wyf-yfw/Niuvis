import path from 'node:path'
import Database from 'better-sqlite3'
import { runMigrations } from './migrate.js'

let db: Database.Database | null = null
let dbPath: string | null = null

export interface InitDatabaseOptions {
  userDataPath: string
  filename?: string
}

export function initDatabase({ userDataPath, filename = 'niuvis.db' }: InitDatabaseOptions) {
  if (db) {
    return db
  }

  dbPath = path.join(userDataPath, filename)
  db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  runMigrations(db)

  return db
}

export function isDatabaseReady() {
  return db !== null
}

export function getDb() {
  if (!db) {
    throw new Error('数据库尚未初始化，请先调用 initDatabase')
  }

  return db
}

export function getDatabasePath() {
  return dbPath
}

export function getDatabaseStatus() {
  const database = getDb()
  const userVersion = database.pragma('user_version', { simple: true }) as number
  const row = database
    .prepare(`SELECT value FROM schema_info WHERE key = 'initialized_at'`)
    .get() as { value: string } | undefined

  return {
    path: dbPath ?? '',
    userVersion,
    ready: Boolean(row?.value),
  }
}

/** 仅用于测试：关闭并清空单例 */
export function resetDatabaseForTests() {
  if (db) {
    db.close()
  }

  db = null
  dbPath = null
}

export function openDatabaseAt(databasePath: string) {
  resetDatabaseForTests()
  dbPath = databasePath
  db = new Database(databasePath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')
  runMigrations(db)

  return db
}
