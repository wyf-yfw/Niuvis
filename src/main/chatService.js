import { DEFAULT_CHAT_BASE_URL, resolveChatConfig } from './settingsStore.js'

const DEFAULT_SYSTEM_PROMPT = '你是 Niuvis，一个简洁可靠的桌面智能助手。回答要直接、清楚、可执行。'

/** @deprecated 使用 resolveChatConfig */
export function getChatConfig(env = process.env) {
  return resolveChatConfig({ env })
}

export function buildChatRequest({ model, messages }) {
  const history = messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .filter((message) => message.content?.trim())
    .map((message) => ({
      role: message.role,
      content: message.content.trim(),
    }))

  return {
    model,
    messages: [
      {
        role: 'system',
        content: DEFAULT_SYSTEM_PROMPT,
      },
      ...history,
    ],
    temperature: 0.7,
  }
}

function validateConfig(config) {
  if (!config.apiKey) {
    throw new Error('缺少模型 API Key，请在左下角设置中配置')
  }

  if (!config.model) {
    throw new Error('缺少模型名称，请在左下角设置中配置')
  }
}

function getChatCompletionsUrl(baseUrl) {
  return `${baseUrl.replace(/\/$/, '')}/chat/completions`
}

export async function sendChatMessage({
  config = resolveChatConfig(),
  messages,
  fetchImpl = fetch,
}) {
  validateConfig(config)

  const response = await fetchImpl(getChatCompletionsUrl(config.baseUrl), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(buildChatRequest({ model: config.model, messages })),
  })

  if (!response.ok) {
    let errorText = ''

    try {
      errorText = await response.text()
    } catch {
      errorText = ''
    }

    throw new Error(`模型请求失败：HTTP ${response.status}${errorText ? ` ${errorText}` : ''}`)
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (!content) {
    throw new Error('模型没有返回可用内容')
  }

  return content
}
