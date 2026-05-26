export type ModelProviderId =
  | 'openai'
  | 'deepseek'
  | 'qwen'
  | 'anthropic'
  | 'ollama'
  | 'custom'

import type { OpenAIApiMode } from './openai.js'

export interface ModelProfile {
  id: string
  providerId: ModelProviderId
  label: string
  apiKey: string
  baseUrl: string
  model: string
  /** OpenAI SDK：chat.completions 或 responses */
  apiMode?: OpenAIApiMode
}

export interface IndexSettings {
  rootPaths: string[]
  excludePaths: string[]
  /**
   * 是否启用 chokidar 实时监听。默认 false，避免对整个家目录 inotify 导致 ENOSPC 与卡顿。
   * 关闭后索引仍持久化在 SQLite，可手动重新扫描更新。
   */
  enableRealtimeWatch?: boolean
}

export interface PermissionSettings {
  confirmDelete: boolean
  confirmMove: boolean
  confirmOverwrite: boolean
  confirmExec: boolean
  confirmSensitivePaths: boolean
}

export interface HistorySettings {
  conversationRetentionDays: number
  auditRetentionDays: number
  backupPath: string
}

export interface AppSettings {
  version: 1
  activeProfileId: string
  profiles: ModelProfile[]
  index: IndexSettings
  permissions: PermissionSettings
  history: HistorySettings
}

export interface ModelConnectionTestResult {
  ok: boolean
  message: string
  latencyMs?: number
}
