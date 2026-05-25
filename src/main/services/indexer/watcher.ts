import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import type { IndexSettings } from '../../../shared/types/settings.js'
import { shouldExcludePath } from './exclude.js'
import { indexSinglePath, removeIndexedPath } from './files.js'
import { loadPersistedIndexStatus, savePersistedIndexStatus } from './state.js'

let watcher: FSWatcher | null = null
let pending = new Map<string, 'add' | 'change' | 'unlink'>()
let flushTimer: ReturnType<typeof setTimeout> | null = null
let activeSettings: IndexSettings | null = null

function scheduleFlush() {
  if (flushTimer) {
    clearTimeout(flushTimer)
  }

  flushTimer = setTimeout(() => {
    void flushPending()
  }, 500)
}

async function flushPending() {
  if (!activeSettings) {
    pending.clear()
    return
  }

  const batch = new Map(pending)
  pending.clear()

  for (const [targetPath, action] of batch) {
    if (action === 'unlink') {
      removeIndexedPath(targetPath)
      continue
    }

    try {
      await indexSinglePath(targetPath, activeSettings)
    } catch {
      // 单文件失败不影响其余增量
    }
  }
}

/**
 * 实时监听默认关闭：对整个 $HOME 做 inotify 会耗尽系统 watcher 限额（ENOSPC）并严重拖慢机器。
 * 开启后使用轮询 + 浅层 depth，且仍遵守排除规则。
 */
export async function startIndexWatcher(settings: IndexSettings): Promise<boolean> {
  await stopIndexWatcher()

  if (settings.enableRealtimeWatch !== true) {
    const persisted = loadPersistedIndexStatus()
    savePersistedIndexStatus({ ...persisted, watcherActive: false })
    return false
  }

  activeSettings = settings

  const enqueue = (targetPath: string, action: 'add' | 'change' | 'unlink') => {
    if (shouldExcludePath(targetPath, settings.excludePaths)) {
      return
    }

    pending.set(path.normalize(targetPath), action)
    scheduleFlush()
  }

  try {
    watcher = chokidar.watch(settings.rootPaths, {
      ignoreInitial: true,
      ignored: (watchPath) => shouldExcludePath(watchPath, settings.excludePaths),
      depth: 4,
      usePolling: true,
      interval: 120_000,
      binaryInterval: 300_000,
      ignorePermissionErrors: true,
      awaitWriteFinish: { stabilityThreshold: 400, pollInterval: 100 },
    })

    watcher.on('add', (filePath: string) => enqueue(filePath, 'add'))
    watcher.on('change', (filePath: string) => enqueue(filePath, 'change'))
    watcher.on('unlink', (filePath: string) => enqueue(filePath, 'unlink'))
    watcher.on('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : String(error)
      console.warn('[Niuvis] 文件监听异常，已关闭实时监听:', message)
      void stopIndexWatcher()
    })

    const persisted = loadPersistedIndexStatus()
    savePersistedIndexStatus({ ...persisted, watcherActive: true })
    console.info('[Niuvis] 已启用索引实时监听（轮询模式，浅层目录）')
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.warn('[Niuvis] 无法启动文件监听:', message)
    await stopIndexWatcher()
    return false
  }
}

export async function stopIndexWatcher() {
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }

  pending.clear()
  activeSettings = null

  if (watcher) {
    try {
      await watcher.close()
    } catch {
      // ignore close errors
    }
    watcher = null
  }

  const persisted = loadPersistedIndexStatus()
  savePersistedIndexStatus({ ...persisted, watcherActive: false })
}

export function isWatcherActive() {
  return Boolean(watcher)
}
