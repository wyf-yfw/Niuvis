export type ToolRiskLevel = 'low' | 'medium' | 'high'

export type ToolCallStatus =
  | 'pending'
  | 'awaiting_approval'
  | 'running'
  | 'completed'
  | 'rejected'
  | 'failed'
  | 'cancelled'

export interface ToolDefinitionSummary {
  name: string
  description: string
  riskLevel: ToolRiskLevel
  requiresConfirmation: boolean
  inputSchema: Record<string, unknown>
}

export interface ToolPreview {
  summary: string
  affectedPaths: string[]
  bytesAffected?: number
  canRollback?: boolean
  previewText?: string
}

export interface ToolResultPayload {
  summary: string
  data?: unknown
}

export interface ToolInvokeRequest {
  toolName: string
  input: unknown
  agentRunId?: string
  conversationId?: string
}

export interface ToolInvokeResult {
  toolCallId: string
  agentRunId: string
  status: ToolCallStatus
  preview?: ToolPreview
  result?: ToolResultPayload
  error?: string
}

export interface PendingToolCall {
  id: string
  agentRunId: string
  toolName: string
  input: unknown
  riskLevel: ToolRiskLevel
  preview: ToolPreview
  createdAt: string
}

export interface ToolApproveRequest {
  toolCallId: string
  rememberMinutes?: number
}

export interface ToolRejectRequest {
  toolCallId: string
  reason?: string
}
