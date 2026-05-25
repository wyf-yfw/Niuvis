import type { IndexSearchParams, IndexStartResult, IndexStatus } from '../../../shared/types/computerIndex.js'
import {
  countComputerIndexItems,
  listComputerIndexDirectory,
  listComputerIndexItems as listIndexRows,
  searchComputerIndex,
} from '../database/indexItems.js'
import { isDatabaseReady } from '../database/index.js'
import { loadAppSettings } from '../settings/store.js'
import { indexInstalledApps } from './apps.js'
import { indexFilesystem } from './files.js'
import {
  getIndexStatus,
  loadPersistedIndexStatus,
  savePersistedIndexStatus,
  setRuntimeRunning,
} from './state.js'
import { startIndexWatcher, stopIndexWatcher } from './watcher.js'

const INDEX_PAGE_SIZE_DEFAULT = 48

let scanPromise: Promise<IndexStartResult> | null = null

export async function startComputerIndex(): Promise<IndexStartResult> {
  if (scanPromise) {
    return scanPromise
  }

  scanPromise = runComputerIndex().finally(() => {
    scanPromise = null
  })

  return scanPromise
}

async function runComputerIndex(): Promise<IndexStartResult> {
  setRuntimeRunning(true)

  const persisted = loadPersistedIndexStatus()
  savePersistedIndexStatus({
    ...persisted,
    status: 'running',
    lastError: null,
  })

  try {
    const settings = loadAppSettings()
    const indexedApps = await indexInstalledApps()
    const fileStats = await indexFilesystem(settings.index)
    const watcherActive = await startIndexWatcher(settings.index)

    const finishedAt = new Date().toISOString()
    savePersistedIndexStatus({
      status: 'idle',
      lastScanAt: finishedAt,
      lastError: null,
      watcherActive,
    })

    return {
      status: getIndexStatus(),
      indexedApps,
      indexedFiles: fileStats.indexed,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    savePersistedIndexStatus({
      ...loadPersistedIndexStatus(),
      status: 'error',
      lastError: message,
      watcherActive: false,
    })

    await stopIndexWatcher()

    throw error
  } finally {
    setRuntimeRunning(false)
  }
}

export function getComputerIndexStatus(): IndexStatus {
  return getIndexStatus()
}

export function searchComputerIndexItems(params: IndexSearchParams) {
  const result = searchComputerIndex({
    query: params.query,
    kind: params.kind,
    limit: params.limit,
    offset: params.offset,
  })

  return {
    items: result.items.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      path: row.path,
      mime: row.mime,
      size: row.size,
      modifiedAt: row.modifiedAt,
      source: row.source,
      contentSnippet: row.contentSnippet,
      highlight: row.highlight,
      metaJson: row.permissionsJson,
    })),
    total: result.total,
    tookMs: result.tookMs,
  }
}

const LIST_HARD_MAX = 200

export function listIndexedDirectory(directoryPath: string | null) {
  const settings = loadAppSettings()
  const rootPaths =
    settings.index.rootPaths.length > 0 ? settings.index.rootPaths : [process.env.HOME ?? process.cwd()]

  return listComputerIndexDirectory(directoryPath, rootPaths)
}

export function listIndexedItems(params: { kind?: string; limit?: number; offset?: number }) {
  const limit = Math.min(Math.max(params.limit ?? INDEX_PAGE_SIZE_DEFAULT, 1), LIST_HARD_MAX)
  const offset = Math.max(params.offset ?? 0, 0)

  const rows = listIndexRows({ ...params, limit, offset })

  return {
    items: rows.map((row) => ({
      id: row.id,
      kind: row.kind,
      name: row.name,
      path: row.path,
      mime: row.mime,
      size: row.size,
      modifiedAt: row.modifiedAt,
      source: row.source,
      contentSnippet: row.contentSnippet,
      metaJson: row.permissionsJson,
    })),
    total: params.kind ? countComputerIndexItems(params.kind) : countComputerIndexItems(),
  }
}

export async function stopComputerIndex() {
  await stopIndexWatcher()
}

/** 应用启动时：库中无条目才全量索引；已有条目仅复用 SQLite（不自动开实时监听，避免 ENOSPC） */
export function bootstrapComputerIndexOnLaunch() {
  if (!isDatabaseReady()) {
    console.warn('[Niuvis] 数据库未就绪，跳过启动时自动索引（请先执行 npm run rebuild:electron）')
    return
  }

  const persisted = loadPersistedIndexStatus()
  const itemCount = countComputerIndexItems()

  if (itemCount > 0) {
    if (!persisted.lastScanAt) {
      savePersistedIndexStatus({
        ...persisted,
        status: 'idle',
        lastScanAt: new Date().toISOString(),
        lastError: null,
        watcherActive: false,
      })
      console.info(`[Niuvis] 检测到已有 ${itemCount} 条索引记录，跳过全量扫描（数据在 SQLite 中）`)
    }
    return
  }

  const scheduleAutoIndex = (reason: string) => {
    console.info(`[Niuvis] ${reason}，8 秒后开始后台索引（不阻塞界面）…`)
    setTimeout(() => {
      void startComputerIndex().catch((error) => {
        console.error('[Niuvis] 自动索引失败:', error)
      })
    }, 8000)
  }

  if (!persisted.lastScanAt) {
    scheduleAutoIndex('首次启动')
    return
  }

  scheduleAutoIndex('索引库为空')
}

