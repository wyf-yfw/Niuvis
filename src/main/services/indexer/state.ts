import type { IndexStatus } from '../../../shared/types/computerIndex.js'
import { getDb } from '../database/index.js'
import { countComputerIndexItems } from '../database/indexItems.js'

const INDEX_STATUS_KEY = 'index_status_v1'

export interface PersistedIndexStatus {
  status: 'idle' | 'running' | 'error'
  lastScanAt: string | null
  lastError: string | null
  watcherActive: boolean
}

function defaultPersisted(): PersistedIndexStatus {
  return {
    status: 'idle',
    lastScanAt: null,
    lastError: null,
    watcherActive: false,
  }
}

export function loadPersistedIndexStatus(): PersistedIndexStatus {
  const db = getDb()
  const row = db.prepare(`SELECT value_json FROM settings WHERE key = ?`).get(INDEX_STATUS_KEY) as
    | { value_json: string }
    | undefined

  if (!row) {
    return defaultPersisted()
  }

  try {
    return { ...defaultPersisted(), ...JSON.parse(row.value_json) }
  } catch {
    return defaultPersisted()
  }
}

export function savePersistedIndexStatus(status: PersistedIndexStatus) {
  const db = getDb()

  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at)
     VALUES (@key, @valueJson, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = datetime('now')`,
  ).run({
    key: INDEX_STATUS_KEY,
    valueJson: JSON.stringify(status),
  })
}

let runtimeRunning = false

export function setRuntimeRunning(running: boolean) {
  runtimeRunning = running
}

export function getIndexStatus(): IndexStatus {
  const persisted = loadPersistedIndexStatus()
  const itemCount = countComputerIndexItems()

  let status = runtimeRunning ? 'running' : persisted.status

  if (!runtimeRunning && itemCount > 0 && status === 'error') {
    status = 'idle'
  }

  return {
    status,
    itemCount,
    lastScanAt: persisted.lastScanAt,
    lastError: persisted.lastError,
    watcherActive: persisted.watcherActive,
    running: runtimeRunning,
  }
}
