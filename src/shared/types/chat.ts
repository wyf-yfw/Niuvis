import type { OpenAIApiMode } from './openai.js'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  toolCallId?: string
  createdAt?: string
  meta?: ChatMessageMeta
}

export interface ChatMessageMeta {
  toolSteps?: ToolStepRecord[]
  citations?: ChatCitation[]
  providerId?: string
  model?: string
}

export interface ToolStepRecord {
  id: string
  toolName: string
  status: 'running' | 'completed' | 'failed' | 'awaiting_approval' | 'rejected'
  summary?: string
  durationMs?: number
  input?: unknown
}

export interface ChatCitation {
  index: number
  path: string
  label?: string
}

export interface ChatModelSettings {
  apiKey: string
  baseUrl: string
  model: string
  apiMode?: OpenAIApiMode
}

export interface ConversationSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  model: string | null
  pinned: boolean
  preview?: string
}

export interface ConversationDetail extends ConversationSummary {
  messages: ChatMessage[]
}
