import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildChatCompletionMessages,
  buildChatRequestBody,
  buildResponsesInput,
  completeOpenAIChat,
  resolveApiMode,
} from '../../../../dist/main/services/chat/openaiAdapter.js'

test('resolveApiMode defaults to chat', () => {
  assert.equal(resolveApiMode({ apiKey: 'k', baseUrl: 'https://api.openai.com/v1', model: 'm' }), 'chat')
  assert.equal(
    resolveApiMode({ apiKey: 'k', baseUrl: 'https://api.openai.com/v1', model: 'm', apiMode: 'responses' }),
    'responses',
  )
})

test('buildChatCompletionMessages keeps user and assistant history', () => {
  const messages = buildChatCompletionMessages([
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
    { role: 'tool', content: 'ignored' },
    { role: 'user', content: '' },
  ])

  assert.equal(messages[0].role, 'system')
  assert.deepEqual(messages.slice(1), [
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
  ])
})

test('buildResponsesInput maps roles for Responses API', () => {
  const input = buildResponsesInput([
    { role: 'user', content: '你好' },
    { role: 'assistant', content: '你好，我是 Niuvis' },
  ])

  assert.equal(input[0].role, 'system')
  assert.equal(input[1].role, 'user')
  assert.equal(input[2].role, 'assistant')
})

test('buildChatRequestBody matches chat completions shape', () => {
  const body = buildChatRequestBody(
    { apiKey: 'k', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
    [{ role: 'user', content: 'ping' }],
  )

  assert.equal(body.model, 'gpt-4o-mini')
  assert.equal(body.temperature, 0.7)
  assert.ok(Array.isArray(body.messages))
})

test('completeOpenAIChat uses chat.completions when apiMode is chat', async () => {
  const calls = []

  const client = {
    chat: {
      completions: {
        create: async (body) => {
          calls.push({ kind: 'chat', body })
          return { choices: [{ message: { content: 'pong' } }] }
        },
      },
    },
    responses: {
      create: async () => {
        throw new Error('responses should not be called')
      },
    },
  }

  const text = await completeOpenAIChat(
    { apiKey: 'k', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiMode: 'chat' },
    [{ role: 'user', content: 'ping' }],
    { client },
  )

  assert.equal(text, 'pong')
  assert.equal(calls[0].kind, 'chat')
})

test('completeOpenAIChat uses responses when apiMode is responses', async () => {
  const calls = []

  const client = {
    chat: {
      completions: {
        create: async () => {
          throw new Error('chat should not be called')
        },
      },
    },
    responses: {
      create: async (body) => {
        calls.push({ kind: 'responses', body })
        return { output_text: 'pong via responses' }
      },
    },
  }

  const text = await completeOpenAIChat(
    { apiKey: 'k', baseUrl: 'https://api.openai.com/v1', model: 'gpt-4.1-mini', apiMode: 'responses' },
    [{ role: 'user', content: 'ping' }],
    { client },
  )

  assert.equal(text, 'pong via responses')
  assert.equal(calls[0].kind, 'responses')
  assert.ok(Array.isArray(calls[0].body.input))
})
