import { randomUUID } from 'node:crypto'
import os from 'node:os'
import type { AppSettings, IndexSettings, ModelProfile } from '../../../shared/types/settings.js'
import { getProviderPreset } from '../../../shared/constants/modelProviders.js'

export const APP_SETTINGS_KEY = 'app_settings_v1'

const DEFAULT_INDEX_EXCLUDES = [
  '**/.git/**',
  '**/node_modules/**',
  '**/.cache/**',
  '**/.venv/**',
  '**/isaacsim/**',
  '**/extscache/**',
  '**/.omni/**',
  '**/.conda/**',
  '**/.npm/**',
  '**/.cargo/**',
  '**/target/**',
  '**/build/**',
  '**/dist/**',
]

export function createDefaultIndexSettings(overrides: Partial<IndexSettings> = {}): IndexSettings {
  return {
    rootPaths: overrides.rootPaths ?? [os.homedir()],
    excludePaths: overrides.excludePaths ?? [...DEFAULT_INDEX_EXCLUDES],
    enableRealtimeWatch: overrides.enableRealtimeWatch ?? false,
  }
}

export function mergeAppSettings(parsed: AppSettings): AppSettings {
  const defaults = createDefaultAppSettings()

  return {
    ...defaults,
    ...parsed,
    profiles: (parsed.profiles?.length ? parsed.profiles : defaults.profiles).map((profile) => ({
      ...profile,
      apiMode: profile.apiMode === 'responses' ? 'responses' : 'chat',
    })),
    index: {
      ...createDefaultIndexSettings(),
      ...parsed.index,
      excludePaths: [
        ...new Set([
          ...DEFAULT_INDEX_EXCLUDES,
          ...(parsed.index?.excludePaths ?? []),
        ]),
      ],
      enableRealtimeWatch: parsed.index?.enableRealtimeWatch ?? false,
    },
  }
}

export function createDefaultProfile(overrides: Partial<ModelProfile> = {}): ModelProfile {
  const providerId = overrides.providerId ?? 'openai'
  const preset = getProviderPreset(providerId)

  return {
    id: overrides.id ?? randomUUID(),
    providerId,
    label: overrides.label ?? preset.label,
    apiKey: overrides.apiKey ?? '',
    baseUrl: overrides.baseUrl ?? preset.defaultBaseUrl,
    model: overrides.model ?? preset.defaultModel,
    apiMode: overrides.apiMode === 'responses' ? 'responses' : 'chat',
  }
}

export function createDefaultAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  const defaultProfile = createDefaultProfile()

  return {
    version: 1,
    activeProfileId: overrides.activeProfileId ?? defaultProfile.id,
    profiles: overrides.profiles ?? [defaultProfile],
    index: createDefaultIndexSettings(overrides.index),
    permissions: {
      confirmDelete: overrides.permissions?.confirmDelete ?? true,
      confirmMove: overrides.permissions?.confirmMove ?? true,
      confirmOverwrite: overrides.permissions?.confirmOverwrite ?? true,
      confirmExec: overrides.permissions?.confirmExec ?? true,
      confirmSensitivePaths: overrides.permissions?.confirmSensitivePaths ?? true,
    },
    history: {
      conversationRetentionDays: overrides.history?.conversationRetentionDays ?? 90,
      auditRetentionDays: overrides.history?.auditRetentionDays ?? 180,
      backupPath: overrides.history?.backupPath ?? '',
    },
  }
}
