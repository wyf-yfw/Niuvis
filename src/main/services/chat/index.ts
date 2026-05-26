import type OpenAI from 'openai'
import type { ChatMessage, ChatModelSettings } from '../../../shared/types/chat.js'
import { resolveChatConfig } from '../../settingsStore.js'
import {
  buildChatRequestBody,
  completeOpenAIChat,
  streamOpenAIChat,
  type NiuvisChatConfig,
  type UiChatMessage,
} from './openaiAdapter.js'

export { DEFAULT_SYSTEM_PROMPT, buildChatRequestBody as buildChatRequest } from './openaiAdapter.js'

function toUiMessages(messages: ChatMessage[] | UiChatMessage[]): UiChatMessage[] {
  return messages.map((message) => ({
    role: message.role,
    content: message.content,
  }))
}

function toNiuvisConfig(config: ChatModelSettings & { apiMode?: NiuvisChatConfig['apiMode'] }): NiuvisChatConfig {
  return {
    apiKey: config.apiKey,
    baseUrl: config.baseUrl,
    model: config.model,
    apiMode: config.apiMode,
  }
}

export async function sendChatMessage({
  config = resolveChatConfig() as ChatModelSettings,
  messages,
  signal,
  client,
}: {
  config?: ChatModelSettings
  messages: ChatMessage[] | UiChatMessage[]
  signal?: AbortSignal
  /** 单测注入 mock client */
  client?: OpenAI
}) {
  return completeOpenAIChat(toNiuvisConfig(config), toUiMessages(messages), { signal, client })
}

export async function streamChatMessage({
  config = resolveChatConfig() as ChatModelSettings,
  messages,
  onDelta,
  signal,
}: {
  config?: ChatModelSettings
  messages: ChatMessage[] | UiChatMessage[]
  onDelta: (delta: string) => void
  signal?: AbortSignal
}) {
  return streamOpenAIChat(toNiuvisConfig(config), toUiMessages(messages), onDelta, { signal })
}
