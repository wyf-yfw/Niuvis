import type {
  ChatCompletionMessageParam,
  ChatCompletionTool,
} from 'openai/resources/chat/completions'
import type { OpenAIApiMode } from '../../../shared/types/openai.js'
import { listToolDefinitions } from '../../agents/tools/index.js'
import {
  createOpenAIClient,
  DEFAULT_SYSTEM_PROMPT,
  type NiuvisChatConfig,
  validateChatConfig,
} from './openaiAdapter.js'

export interface ParsedToolCall {
  id: string
  name: string
  arguments: string
}

export interface ModelTurnResult {
  content: string
  toolCalls: ParsedToolCall[]
}

export function buildOpenAIFunctionTools(): ChatCompletionTool[] {
  return listToolDefinitions().map((definition) => ({
    type: 'function',
    function: {
      name: definition.name,
      description: definition.description,
      parameters: definition.inputSchema as Record<string, unknown>,
    },
  }))
}

export function buildToolsSystemPrompt() {
  const tools = listToolDefinitions()

  return [
    '你可以通过输出以下 JSON 块调用工具（适用于不支持 function calling 的模型）：',
    '<tool>{"name":"工具名","arguments":{...}}</tool>',
    '可用工具：',
    ...tools.map((tool) => `- ${tool.name}: ${tool.description}`),
  ].join('\n')
}

const JSON_TOOL_PATTERN = /<tool>\s*(\{[\s\S]*?\})\s*<\/tool>/gi

export function extractJsonPlanToolCalls(text: string): ParsedToolCall[] {
  const calls: ParsedToolCall[] = []
  let index = 0

  for (const match of text.matchAll(JSON_TOOL_PATTERN)) {
    try {
      const payload = JSON.parse(match[1]) as { name?: string; arguments?: unknown }
      if (!payload.name) continue

      calls.push({
        id: `json-plan-${Date.now()}-${index}`,
        name: payload.name,
        arguments: JSON.stringify(payload.arguments ?? {}),
      })
      index += 1
    } catch {
      // ignore invalid blocks
    }
  }

  return calls
}

export interface OrchestratorHistoryMessage {
  role: string
  content?: string
  toolCallId?: string
  toolCalls?: ParsedToolCall[]
}

export function toOrchestratorCompletionMessages(
  messages: OrchestratorHistoryMessage[],
  options: { includeJsonPlanHint?: boolean } = {},
): ChatCompletionMessageParam[] {
  const items: ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: options.includeJsonPlanHint
        ? `${DEFAULT_SYSTEM_PROMPT}\n\n${buildToolsSystemPrompt()}`
        : DEFAULT_SYSTEM_PROMPT,
    },
  ]

  for (const message of messages) {
    if (message.role === 'user' || message.role === 'assistant') {
      if (!message.content?.trim()) continue

      items.push({
        role: message.role as 'user' | 'assistant',
        content: message.content.trim(),
      })
      continue
    }

    // OpenAI 要求 role=tool 必须紧跟带 tool_calls 的 assistant 消息。
    // 我们持久化的是 tool 摘要，没有完整 tool_calls 结构，故转为 user 上下文。
    if (message.role === 'tool' && message.content?.trim()) {
      items.push({
        role: 'user',
        content: `【工具结果】${message.content.trim()}`,
      })
    }
  }

  return items
}

export async function streamModelTurn(
  config: NiuvisChatConfig,
  messages: ChatCompletionMessageParam[],
  options: {
    enableTools?: boolean
    onDelta: (delta: string) => void
    signal?: AbortSignal
  },
): Promise<ModelTurnResult> {
  validateChatConfig(config)

  const client = createOpenAIClient(config)
  const useTools = options.enableTools !== false && config.apiMode !== 'responses'

  const stream = await client.chat.completions.create(
    {
      model: config.model,
      messages,
      temperature: 0.7,
      stream: true,
      ...(useTools ? { tools: buildOpenAIFunctionTools(), tool_choice: 'auto' as const } : {}),
    },
    { signal: options.signal },
  )

  let content = ''
  const toolCalls = new Map<number, ParsedToolCall>()

  for await (const chunk of stream) {
    const choice = chunk.choices[0]

    if (!choice) continue

    const delta = choice.delta

    if (delta?.content) {
      content += delta.content
      options.onDelta(delta.content)
    }

    if (delta?.tool_calls) {
      for (const toolDelta of delta.tool_calls) {
        const index = toolDelta.index ?? 0
        const current = toolCalls.get(index) ?? {
          id: toolDelta.id ?? `call-${index}`,
          name: toolDelta.function?.name ?? '',
          arguments: '',
        }

        if (toolDelta.id) current.id = toolDelta.id
        if (toolDelta.function?.name) current.name = toolDelta.function.name
        if (toolDelta.function?.arguments) current.arguments += toolDelta.function.arguments

        toolCalls.set(index, current)
      }
    }
  }

  return {
    content,
    toolCalls: [...toolCalls.values()].filter((call) => call.name),
  }
}

export function shouldUseJsonPlan(config: NiuvisChatConfig) {
  return config.apiMode === 'responses'
}

export function resolveApiModeForOrchestrator(apiMode?: OpenAIApiMode) {
  return apiMode === 'responses' ? 'responses' : 'chat'
}
