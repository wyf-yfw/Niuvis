import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChatRequest,
  sendChatMessage,
} from './chatService.js'
import { resolveChatConfig } from './settingsStore.js'

test('resolveChatConfig reads Niuvis chat environment variables', () => {
  const config = resolveChatConfig({
    env: {
      NIUVIS_CHAT_API_KEY: 'key',
      NIUVIS_CHAT_BASE_URL: 'https://example.com/v1',
      NIUVIS_CHAT_MODEL: 'model-a',
    },
  })

  assert.deepEqual(config, {
    apiKey: 'key',
    baseUrl: 'https://example.com/v1',
    model: 'model-a',
  })
})

test('buildChatRequest keeps only user and assistant messages', () => {
  const body = buildChatRequest({
    model: 'model-a',
    messages: [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'system', content: 'ignored by ui history' },
      { role: 'user', content: '' },
    ],
  })

  assert.deepEqual(body, {
    model: 'model-a',
    messages: [
      {
        role: 'system',
        content: '你是 Niuvis，一个简洁可靠的桌面智能助手。回答要直接、清楚、可执行。',
      },
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
    ],
    temperature: 0.7,
  })
})

test('sendChatMessage posts to chat completions endpoint and returns assistant text', async () => {
  const calls = []
  const reply = await sendChatMessage({
    config: {
      apiKey: 'key',
      baseUrl: 'https://example.com/v1/',
      model: 'model-a',
    },
    messages: [{ role: 'user', content: 'hello' }],
    fetchImpl: async (url, options) => {
      calls.push({ url, options })
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'world' } }],
        }),
      }
    },
  })

  assert.equal(reply, 'world')
  assert.equal(calls[0].url, 'https://example.com/v1/chat/completions')
  assert.equal(calls[0].options.method, 'POST')
  assert.equal(calls[0].options.headers.Authorization, 'Bearer key')
})

test('sendChatMessage reports missing model configuration', async () => {
  await assert.rejects(
    () =>
      sendChatMessage({
        config: {
          apiKey: 'key',
          baseUrl: 'https://example.com/v1',
          model: '',
        },
        messages: [{ role: 'user', content: 'hello' }],
        fetchImpl: async () => {
          throw new Error('should not call fetch')
        },
      }),
    /模型名称/,
  )
})
