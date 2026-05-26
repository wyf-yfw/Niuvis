import fs from 'node:fs/promises'
import path from 'node:path'

export const SETTINGS_VERSION = 1
export const DEFAULT_CHAT_BASE_URL = 'https://api.openai.com/v1'

export function normalizeChatSettings(raw = {}) {
  const baseUrl = String(raw.baseUrl ?? '').trim()

  const apiMode = raw.apiMode === 'responses' ? 'responses' : 'chat'

  return {
    apiKey: String(raw.apiKey ?? '').trim(),
    baseUrl: baseUrl || DEFAULT_CHAT_BASE_URL,
    model: String(raw.model ?? '').trim(),
    apiMode,
  }
}

export function resolveChatConfig({ env = process.env, stored = {} } = {}) {
  const saved = normalizeChatSettings(stored)
  const hasSavedChat = Boolean(saved.apiKey || saved.model)

  return {
    apiKey: saved.apiKey || env.NIUVIS_CHAT_API_KEY || env.OPENAI_API_KEY || '',
    baseUrl: hasSavedChat
      ? saved.baseUrl
      : env.NIUVIS_CHAT_BASE_URL || env.OPENAI_BASE_URL || DEFAULT_CHAT_BASE_URL,
    model: saved.model || env.NIUVIS_CHAT_MODEL || env.OPENAI_MODEL || '',
    apiMode: hasSavedChat
      ? saved.apiMode
      : env.NIUVIS_CHAT_API_MODE === 'responses'
        ? 'responses'
        : 'chat',
  }
}

export async function loadChatSettings({
  settingsPath,
  readFile = fs.readFile,
}) {
  try {
    const text = await readFile(settingsPath, 'utf8')
    const parsed = JSON.parse(text)

    return normalizeChatSettings(parsed.chat ?? parsed)
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return normalizeChatSettings({})
    }

    throw error
  }
}

export async function saveChatSettings({
  settingsPath,
  chat,
  writeFile = fs.writeFile,
  mkdir = fs.mkdir,
}) {
  const normalized = normalizeChatSettings(chat)

  await mkdir(path.dirname(settingsPath), { recursive: true })
  await writeFile(
    settingsPath,
    JSON.stringify(
      {
        version: SETTINGS_VERSION,
        chat: normalized,
      },
      null,
      2,
    ),
    'utf8',
  )

  return normalized
}
