export type ComputerIndexKind = 'app' | 'file' | 'document' | 'image'

export type IndexRunStatus = 'idle' | 'running' | 'error'

export interface ComputerIndexItem {
  id: string
  kind: ComputerIndexKind
  name: string
  path: string
  mime?: string
  size?: number
  modifiedAt?: string
  source?: string
  contentSnippet?: string
  highlight?: string
  /** 应用索引的扩展元数据（command、icon 等） */
  metaJson?: string
}

export interface IndexSearchParams {
  query: string
  kind?: ComputerIndexKind
  limit?: number
  offset?: number
}

export interface IndexSearchResult {
  items: ComputerIndexItem[]
  total: number
  tookMs: number
}

export interface IndexListParams {
  kind?: ComputerIndexKind
  limit?: number
  offset?: number
}

export interface IndexListResult {
  items: ComputerIndexItem[]
  total: number
}

/** 仅展示索引内的目录项（不读取未索引的文件系统路径） */
export interface IndexDirectoryEntry {
  name: string
  path: string
  isDirectory: boolean
  kind?: ComputerIndexKind
  size?: number
  modifiedAt?: string
}

export interface IndexDirectoryListing {
  /** null 表示索引根（设置中的 rootPaths） */
  path: string | null
  parentPath: string | null
  entries: IndexDirectoryEntry[]
}

export interface IndexStatus {
  status: IndexRunStatus
  itemCount: number
  lastScanAt: string | null
  lastError: string | null
  watcherActive: boolean
  running: boolean
  /** 本机 SQLite 路径，便于确认索引已落盘 */
  databasePath?: string
}

export interface IndexStartResult {
  status: IndexStatus
  indexedApps: number
  indexedFiles: number
}
