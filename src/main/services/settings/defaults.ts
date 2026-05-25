import { randomUUID } from 'node:crypto'
import os from 'node:os'
import type { AppSettings, ModelProfile } from '../../../shared/types/settings.js'
import { getProviderPreset } from '../../../shared/constants/modelProviders.js'

export const APP_SETTINGS_KEY = 'app_settings_v1'

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
  }
}

export function createDefaultAppSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  const defaultProfile = createDefaultProfile()

  return {
    version: 1,
    activeProfileId: overrides.activeProfileId ?? defaultProfile.id,
    profiles: overrides.profiles ?? [defaultProfile],
    index: {
      rootPaths: overrides.index?.rootPaths ?? [os.homedir()],
      excludePaths: overrides.index?.excludePaths ?? [
        '**/.git/**',
        '**/node_modules/**',
        '**/.cache/**',
      ],
    },
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
