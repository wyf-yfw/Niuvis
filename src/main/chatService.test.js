import test from 'node:test'
import assert from 'node:assert/strict'
import { buildChatRequest, sendChatMessage } from '../../dist/main/services/chat/index.js'
import { resolveChatConfig } from './settingsStore.js'

test('resolveChatConfig reads Niuvis chat environment variables', () => {
  const config = resolveChatConfig({
    env: {
      NIUVIS_CHAT_API_KEY: 'key',
      NIUVIS_CHAT_BASE_URL: 'https://example.com/v1',
      NIUVIS_CHAT_MODEL: 'model-a',
      NIUVIS_CHAT_API_MODE: 'responses',
    },
  })

  assert.deepEqual(config, {
    apiKey: 'key',
    baseUrl: 'https://example.com/v1',
    model: 'model-a',
    apiMode: 'responses',
  })
})

test('buildChatRequest keeps only user and assistant messages', () => {
  const body = buildChatRequest(
    { apiKey: 'k', baseUrl: 'https://example.com/v1', model: 'model-a', apiMode: 'chat' },
    [
      { role: 'user', content: 'hello' },
      { role: 'assistant', content: 'hi' },
      { role: 'system', content: 'ignored by ui history' },
      { role: 'user', content: '' },
    ],
  )

  assert.equal(body.model, 'model-a')
  assert.equal(body.temperature, 0.7)
  assert.equal(body.messages[0].role, 'system')
  assert.equal(body.messages[1].content, 'hello')
})

test('sendChatMessage uses OpenAI SDK chat completions path', async () => {
  const client = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'world' } }],
        }),
      },
    },
    responses: {
      create: async () => {
        throw new Error('unexpected responses')
      },
    },
  }

  const reply = await sendChatMessage({
    config: {
      apiKey: 'key',
      baseUrl: 'https://example.com/v1/',
      model: 'model-a',
      apiMode: 'chat',
    },
    messages: [{ id: '1', role: 'user', content: 'hello' }],
    client,
  })

  assert.equal(reply, 'world')
})

test('sendChatMessage reports missing model configuration', async () => {
  await assert.rejects(
    () =>
      sendChatMessage({
        config: {
          apiKey: 'key',
          baseUrl: 'https://example.com/v1',
          model: '',
          apiMode: 'chat',
        },
        messages: [{ id: '1', role: 'user', content: 'hello' }],
      }),
    /模型名称/,
  )
})
