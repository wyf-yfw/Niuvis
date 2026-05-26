import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { ResponseInput } from 'openai/resources/responses/responses'
import type { OpenAIApiMode } from '../../../shared/types/openai.js'

export const DEFAULT_SYSTEM_PROMPT =
  '你是 Niuvis，一个简洁可靠的桌面智能助手。回答要直接、清楚、可执行。'

export interface NiuvisChatConfig {
  apiKey: string
  baseUrl: string
  model: string
  apiMode?: OpenAIApiMode
}

export interface UiChatMessage {
  role: string
  content?: string
}

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/$/, '')
}

export function resolveApiMode(config: NiuvisChatConfig): OpenAIApiMode {
  return config.apiMode === 'responses' ? 'responses' : 'chat'
}

export function validateChatConfig(config: NiuvisChatConfig) {
  if (!config.apiKey?.trim()) {
    throw new Error('缺少模型 API Key，请在左下角设置中配置')
  }

  if (!config.model?.trim()) {
    throw new Error('缺少模型名称，请在左下角设置中配置')
  }
}

export function buildChatRequestBody(config: NiuvisChatConfig, messages: UiChatMessage[]) {
  return {
    model: config.model,
    messages: buildChatCompletionMessages(messages),
    temperature: 0.7,
  }
}

export function buildChatCompletionMessages(messages: UiChatMessage[]): ChatCompletionMessageParam[] {
  const history = messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .filter((message) => message.content?.trim())
    .map((message) => ({
      role: message.role as 'user' | 'assistant',
      content: message.content!.trim(),
    }))

  return [
    { role: 'system', content: DEFAULT_SYSTEM_PROMPT },
    ...history,
  ]
}

export function buildResponsesInput(messages: UiChatMessage[]): ResponseInput {
  const items: ResponseInput = [
    {
      role: 'system',
      content: DEFAULT_SYSTEM_PROMPT,
    },
  ]

  for (const message of messages) {
    if (!message.content?.trim()) continue

    if (message.role === 'user') {
      items.push({
        role: 'user',
        content: message.content.trim(),
      })
      continue
    }

    if (message.role === 'assistant') {
      items.push({
        role: 'assistant',
        content: message.content.trim(),
      })
    }
  }

  return items
}

export function createOpenAIClient(config: NiuvisChatConfig) {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: normalizeBaseUrl(config.baseUrl),
  })
}

function extractResponsesText(response: OpenAI.Responses.Response) {
  if (response.output_text?.trim()) {
    return response.output_text.trim()
  }

  const chunks: string[] = []

  for (const item of response.output ?? []) {
    if (item.type !== 'message') continue

    for (const part of item.content ?? []) {
      if (part.type === 'output_text' && part.text) {
        chunks.push(part.text)
      }
    }
  }

  const text = chunks.join('').trim()

  if (!text) {
    throw new Error('模型没有返回可用内容（Responses API）')
  }

  return text
}

async function completeViaChatCompletions(
  client: OpenAI,
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  signal?: AbortSignal,
) {
  const completion = await client.chat.completions.create(
    {
      model: config.model,
      messages: buildChatCompletionMessages(messages),
      temperature: 0.7,
    },
    { signal },
  )

  const content = completion.choices[0]?.message?.content

  if (!content) {
    throw new Error('模型没有返回可用内容（Chat Completions）')
  }

  return typeof content === 'string' ? content : JSON.stringify(content)
}

async function completeViaResponses(
  client: OpenAI,
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  signal?: AbortSignal,
) {
  const response = await client.responses.create(
    {
      model: config.model,
      input: buildResponsesInput(messages),
      temperature: 0.7,
    },
    { signal },
  )

  return extractResponsesText(response)
}

async function streamViaChatCompletions(
  client: OpenAI,
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) {
  const stream = await client.chat.completions.create(
    {
      model: config.model,
      messages: buildChatCompletionMessages(messages),
      temperature: 0.7,
      stream: true,
    },
    { signal },
  )

  let full = ''

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content

    if (!delta) continue

    const piece = typeof delta === 'string' ? delta : ''
    full += piece
    onDelta(piece)
  }

  if (!full.trim()) {
    throw new Error('模型没有返回可用内容（Chat Completions 流式）')
  }

  return full
}

async function streamViaResponses(
  client: OpenAI,
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
) {
  const stream = await client.responses.create(
    {
      model: config.model,
      input: buildResponsesInput(messages),
      temperature: 0.7,
      stream: true,
    },
    { signal },
  )

  let full = ''

  for await (const event of stream) {
    if (event.type === 'response.output_text.delta' && 'delta' in event && event.delta) {
      full += event.delta
      onDelta(event.delta)
    }
  }

  if (!full.trim()) {
    throw new Error('模型没有返回可用内容（Responses API 流式）')
  }

  return full
}

export async function completeOpenAIChat(
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  options: {
    signal?: AbortSignal
    client?: OpenAI
  } = {},
) {
  validateChatConfig(config)

  const client = options.client ?? createOpenAIClient(config)
  const mode = resolveApiMode(config)

  if (mode === 'responses') {
    return completeViaResponses(client, config, messages, options.signal)
  }

  return completeViaChatCompletions(client, config, messages, options.signal)
}

export async function streamOpenAIChat(
  config: NiuvisChatConfig,
  messages: UiChatMessage[],
  onDelta: (delta: string) => void,
  options: {
    signal?: AbortSignal
    client?: OpenAI
  } = {},
) {
  validateChatConfig(config)

  const client = options.client ?? createOpenAIClient(config)
  const mode = resolveApiMode(config)

  if (mode === 'responses') {
    return streamViaResponses(client, config, messages, onDelta, options.signal)
  }

  return streamViaChatCompletions(client, config, messages, onDelta, options.signal)
}
