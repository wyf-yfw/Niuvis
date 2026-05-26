import type { ToolPreview, ToolResultPayload, ToolRiskLevel } from './tools.js'

export type AgentStreamEventType =
  | 'run_started'
  | 'assistant_delta'
  | 'assistant_done'
  | 'tool_started'
  | 'tool_finished'
  | 'tool_awaiting_approval'
  | 'run_done'
  | 'run_error'
  | 'run_stopped'

export interface AgentStreamEvent {
  type: AgentStreamEventType
  runId: string
  conversationId: string
  /** 增量文本（assistant_delta） */
  delta?: string
  /** 完整助手文本（assistant_done / run_done） */
  content?: string
  messageId?: string
  toolCallId?: string
  toolName?: string
  toolInput?: unknown
  toolPreview?: ToolPreview
  toolResult?: ToolResultPayload
  toolRiskLevel?: ToolRiskLevel
  toolStatus?: string
  toolDurationMs?: number
  error?: string
}

export interface AgentRunRequest {
  conversationId?: string
  message: string
  attachments?: AgentAttachment[]
}

export interface AgentAttachment {
  path: string
  name: string
  /** 已读取的文本片段（主进程填充） */
  excerpt?: string
}

export interface AgentRunHandle {
  runId: string
  conversationId: string
}

export interface FilePreviewResult {
  path: string
  isDirectory: boolean
  size: number
  content: string
}
