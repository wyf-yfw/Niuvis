import { z } from 'zod'
import type { ToolPreview, ToolResultPayload, ToolRiskLevel } from '../../../shared/types/tools.js'

export interface ToolContext {
  agentRunId: string
  toolCallId: string
}

export interface NiuvisTool<TInput = unknown> {
  name: string
  description: string
  riskLevel: ToolRiskLevel
  requiresConfirmation: boolean
  inputSchema: z.ZodType<TInput>
  preview: (input: TInput) => ToolPreview
  execute: (input: TInput, ctx: ToolContext) => Promise<ToolResultPayload>
}

/** 注册表使用的擦除类型（避免泛型协变冲突） */
export type AnyNiuvisTool = NiuvisTool<any>
