export type ModelProviderId =
  | 'openai'
  | 'deepseek'
  | 'qwen'
  | 'anthropic'
  | 'ollama'
  | 'custom'

export interface ModelProfile {
  id: string
  providerId: ModelProviderId
  label: string
  apiKey: string
  baseUrl: string
  model: string
}

export interface IndexSettings {
  rootPaths: string[]
  excludePaths: string[]
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
