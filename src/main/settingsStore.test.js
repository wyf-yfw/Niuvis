import test from 'node:test'
import assert from 'node:assert/strict'
import {
  DEFAULT_CHAT_BASE_URL,
  loadChatSettings,
  normalizeChatSettings,
  resolveChatConfig,
  saveChatSettings,
} from './settingsStore.js'

test('normalizeChatSettings fills default base url', () => {
  assert.deepEqual(normalizeChatSettings({ apiKey: 'k', model: 'm' }), {
    apiKey: 'k',
    baseUrl: DEFAULT_CHAT_BASE_URL,
    model: 'm',
  })
})

test('resolveChatConfig prefers saved api key and model', () => {
  const config = resolveChatConfig({
    env: {
      NIUVIS_CHAT_API_KEY: 'env-key',
      NIUVIS_CHAT_MODEL: 'env-model',
      NIUVIS_CHAT_BASE_URL: 'https://env.example/v1',
    },
    stored: {
      apiKey: 'saved-key',
      baseUrl: 'https://saved.example/v1',
      model: 'saved-model',
    },
  })

  assert.deepEqual(config, {
    apiKey: 'saved-key',
    baseUrl: 'https://saved.example/v1',
    model: 'saved-model',
  })
})

test('resolveChatConfig falls back to environment variables', () => {
  const config = resolveChatConfig({
    env: {
      OPENAI_API_KEY: 'env-key',
      OPENAI_MODEL: 'env-model',
      OPENAI_BASE_URL: 'https://env.example/v1',
    },
    stored: {},
  })

  assert.deepEqual(config, {
    apiKey: 'env-key',
    baseUrl: 'https://env.example/v1',
    model: 'env-model',
  })
})

test('saveChatSettings and loadChatSettings round trip', async () => {
  const settingsPath = `/tmp/niuvis-settings-${Date.now()}.json`

  await saveChatSettings({
    settingsPath,
    chat: {
      apiKey: 'abc',
      baseUrl: 'https://api.deepseek.com/v1',
      model: 'deepseek-chat',
    },
    mkdir: async () => {},
    writeFile: async (filePath, content) => {
      assert.equal(filePath, settingsPath)
      assert.match(content, /deepseek-chat/)
    },
    readFile: async () =>
      JSON.stringify({
        version: 1,
        chat: {
          apiKey: 'abc',
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
        },
      }),
  })

  const loaded = await loadChatSettings({
    settingsPath,
    readFile: async () =>
      JSON.stringify({
        version: 1,
        chat: {
          apiKey: 'abc',
          baseUrl: 'https://api.deepseek.com/v1',
          model: 'deepseek-chat',
        },
      }),
  })

  assert.deepEqual(loaded, {
    apiKey: 'abc',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  })
})
