import fs from 'node:fs/promises'
import path from 'node:path'
import { safeStorage } from 'electron'
import type { AppSettings, ModelProfile } from '../../../shared/types/settings.js'
import { getDb } from '../database/index.js'
import {
  createDefaultAppSettings,
  createDefaultProfile,
  mergeAppSettings,
  APP_SETTINGS_KEY,
} from './defaults.js'
import { normalizeChatSettings } from '../../settingsStore.js'

const ENCRYPTED_PREFIX = 'enc:'

function canEncrypt() {
  return safeStorage.isEncryptionAvailable()
}

function encryptSecret(value: string) {
  if (!value || !canEncrypt()) {
    return value
  }

  return `${ENCRYPTED_PREFIX}${safeStorage.encryptString(value).toString('base64')}`
}

function decryptSecret(value: string) {
  if (!value.startsWith(ENCRYPTED_PREFIX)) {
    return value
  }

  if (!canEncrypt()) {
    return ''
  }

  const encoded = value.slice(ENCRYPTED_PREFIX.length)
  return safeStorage.decryptString(Buffer.from(encoded, 'base64'))
}

function encryptProfiles(profiles: ModelProfile[]): ModelProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    apiKey: encryptSecret(profile.apiKey),
  }))
}

function decryptProfiles(profiles: ModelProfile[]): ModelProfile[] {
  return profiles.map((profile) => ({
    ...profile,
    apiKey: decryptSecret(profile.apiKey),
  }))
}

function serializeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    profiles: encryptProfiles(settings.profiles),
  }
}

function deserializeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    profiles: decryptProfiles(settings.profiles),
  }
}

function parseSettingsJson(raw: string): AppSettings {
  const parsed = JSON.parse(raw) as AppSettings

  if (parsed.version !== 1 || !Array.isArray(parsed.profiles)) {
    throw new Error('无效的设置格式')
  }

  return deserializeSettings(mergeAppSettings(parsed))
}

export function getActiveProfile(settings: AppSettings): ModelProfile {
  const active = settings.profiles.find((profile) => profile.id === settings.activeProfileId)

  return active ?? settings.profiles[0] ?? createDefaultProfile()
}

export function getActiveChatConfig(settings: AppSettings) {
  const profile = getActiveProfile(settings)

  return normalizeChatSettings({
    apiKey: profile.apiKey,
    baseUrl: profile.baseUrl,
    model: profile.model,
  })
}

export async function migrateSettingsFromJsonIfNeeded({
  settingsPath,
  readFile = fs.readFile,
}: {
  settingsPath: string
  readFile?: typeof fs.readFile
}) {
  const db = getDb()
  const existing = db.prepare(`SELECT key FROM settings WHERE key = ?`).get(APP_SETTINGS_KEY)

  if (existing) {
    return false
  }

  try {
    const text = await readFile(settingsPath, 'utf8')
    const parsed = JSON.parse(text)
    const legacyChat = normalizeChatSettings(parsed.chat ?? parsed)
    const profile = createDefaultProfile({
      providerId: 'custom',
      label: '已导入配置',
      apiKey: legacyChat.apiKey,
      baseUrl: legacyChat.baseUrl,
      model: legacyChat.model,
    })
    const settings = createDefaultAppSettings({
      activeProfileId: profile.id,
      profiles: [profile],
    })

    saveAppSettings(settings)

    return true
  } catch (error) {
    if (error && typeof error === 'object' && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      saveAppSettings(createDefaultAppSettings())
      return true
    }

    throw error
  }
}

export function loadAppSettings(): AppSettings {
  const db = getDb()
  const row = db.prepare(`SELECT value_json FROM settings WHERE key = ?`).get(APP_SETTINGS_KEY) as
    | { value_json: string }
    | undefined

  if (!row) {
    const defaults = createDefaultAppSettings()
    saveAppSettings(defaults)

    return defaults
  }

  return parseSettingsJson(row.value_json)
}

export function saveAppSettings(settings: AppSettings): AppSettings {
  const db = getDb()
  const normalized: AppSettings = {
    ...settings,
    version: 1,
    profiles: settings.profiles.length > 0 ? settings.profiles : [createDefaultProfile()],
    activeProfileId:
      settings.profiles.find((profile) => profile.id === settings.activeProfileId)?.id ??
      settings.profiles[0]?.id ??
      createDefaultProfile().id,
  }

  const payload = JSON.stringify(serializeSettings(normalized))

  db.prepare(
    `INSERT INTO settings (key, value_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(key) DO UPDATE SET
       value_json = excluded.value_json,
       updated_at = excluded.updated_at`,
  ).run(APP_SETTINGS_KEY, payload)

  return deserializeSettings(normalized)
}
