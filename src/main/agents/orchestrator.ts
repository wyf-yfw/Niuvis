import path from 'node:path'
import type { WebContents } from 'electron'
import type { AgentAttachment, AgentRunRequest } from '../../shared/types/agent.js'
import type { ChatCitation, ChatMessage, ToolStepRecord } from '../../shared/types/chat.js'
import type { ToolInvokeResult } from '../../shared/types/tools.js'
import { getActiveChatConfig, getActiveProfile, loadAppSettings } from '../services/settings/store.js'
import {
  createConversation,
  getConversation,
  insertMessage,
  listMessagesForModel,
  updateConversation,
} from '../services/database/conversations.js'
import { createAgentRun, finishAgentRun } from '../services/database/agentRuns.js'
import { readContentSnippet } from '../services/indexer/documents.js'
import { estimateTokens } from '../services/chat/messageCodec.js'
import {
  extractJsonPlanToolCalls,
  shouldUseJsonPlan,
  streamModelTurn,
  toOrchestratorCompletionMessages,
  type ParsedToolCall,
} from '../services/chat/openaiTools.js'
import type { NiuvisChatConfig } from '../services/chat/openaiAdapter.js'
import { waitForToolDecision } from './approvalBridge.js'
import { invokeTool } from './runtime.js'
import { clearRunAbortController, createRunAbortController, emitAgentEvent, stopAgentRun } from './streamHub.js'

const MAX_TOOL_ITERATIONS = 8

function buildAttachmentContext(attachments: AgentAttachment[] = []) {
  if (attachments.length === 0) return ''

  return attachments
    .map(
      (file, index) =>
        `[附件 ${index + 1}] ${file.name}\n路径：${file.path}\n${file.excerpt ? `摘要：${file.excerpt}` : ''}`,
    )
    .join('\n\n')
}

async function enrichAttachments(attachments: AgentAttachment[] = []) {
  const enriched: AgentAttachment[] = []

  for (const file of attachments) {
    let excerpt = file.excerpt ?? ''

    if (!excerpt) {
      try {
        excerpt = (await readContentSnippet(file.path)).slice(0, 4000)
      } catch {
        excerpt = ''
      }
    }

    enriched.push({ ...file, excerpt })
  }

  return enriched
}

function extractCitationsFromSearchResult(result: ToolInvokeResult, startIndex: number) {
  const citations: ChatCitation[] = []
  const data = result.result?.data as { items?: Array<{ path?: string; name?: string }> } | undefined

  if (!data?.items) return citations

  let index = startIndex

  for (const item of data.items) {
    if (!item.path) continue

    citations.push({
      index,
      path: item.path,
      label: item.name ?? path.basename(item.path),
    })
    index += 1
  }

  return citations
}

function mergeCitations(existing: ChatCitation[], incoming: ChatCitation[]) {
  const seen = new Set(existing.map((item) => item.path))
  const merged = [...existing]

  for (const citation of incoming) {
    if (seen.has(citation.path)) continue

    merged.push({ ...citation, index: merged.length + 1 })
    seen.add(citation.path)
  }

  return merged.map((item, idx) => ({ ...item, index: idx + 1 }))
}

function parseToolArguments(raw: string) {
  try {
    return JSON.parse(raw) as Record<string, unknown>
  } catch {
    return {}
  }
}

async function executeToolWithApproval(options: {
  toolCall: ParsedToolCall
  agentRunId: string
  conversationId: string
  webContents: WebContents
  runId: string
}) {
  const started = Date.now()
  const input = parseToolArguments(options.toolCall.arguments)

  emitAgentEvent(options.webContents, {
    type: 'tool_started',
    runId: options.runId,
    conversationId: options.conversationId,
    toolCallId: options.toolCall.id,
    toolName: options.toolCall.name,
    toolInput: input,
  })

  let result = await invokeTool({
    toolName: options.toolCall.name,
    input,
    agentRunId: options.agentRunId,
    conversationId: options.conversationId,
  })

  if (result.status === 'awaiting_approval') {
    emitAgentEvent(options.webContents, {
      type: 'tool_awaiting_approval',
      runId: options.runId,
      conversationId: options.conversationId,
      toolCallId: result.toolCallId,
      toolName: options.toolCall.name,
      toolInput: input,
      toolPreview: result.preview,
    })

    result = await waitForToolDecision(result.toolCallId)
  }

  emitAgentEvent(options.webContents, {
    type: 'tool_finished',
    runId: options.runId,
    conversationId: options.conversationId,
    toolCallId: result.toolCallId,
    toolName: options.toolCall.name,
    toolStatus: result.status,
    toolResult: result.result,
    toolDurationMs: Date.now() - started,
    error: result.error,
  })

  return result
}

export async function prepareAgentRun(request: AgentRunRequest) {
  const settings = loadAppSettings()
  const profile = getActiveProfile(settings)
  const config: NiuvisChatConfig = {
    ...getActiveChatConfig(settings),
    apiMode: profile.apiMode,
  }

  const attachments = await enrichAttachments(request.attachments)
  const userText = request.message.trim()

  if (!userText && attachments.length === 0) {
    throw new Error('请输入消息或添加附件')
  }

  let conversationId = request.conversationId

  if (!conversationId) {
    const created = createConversation(userText.slice(0, 40) || '新对话', config.model)
    conversationId = created.id
  } else if (!getConversation(conversationId)) {
    throw new Error('会话不存在')
  }

  const runId = createAgentRun({
    conversationId,
    userRequest: userText,
  })

  const userContent =
    attachments.length > 0
      ? `${userText}\n\n---\n${buildAttachmentContext(attachments)}`.trim()
      : userText

  insertMessage({
    conversationId,
    role: 'user',
    content: userContent,
  })

  if (getConversation(conversationId)?.title === '新对话' && userText) {
    updateConversation(conversationId, { title: userText.slice(0, 48), model: config.model })
  }

  return { runId, conversationId, config, profile }
}

export async function runAgentTurn(
  request: AgentRunRequest,
  webContents: WebContents,
  prepared?: Awaited<ReturnType<typeof prepareAgentRun>>,
): Promise<{ runId: string; conversationId: string }> {
  const { runId, conversationId, config, profile } = prepared ?? (await prepareAgentRun(request))
  const abortController = createRunAbortController(runId)
  const signal = abortController.signal

  emitAgentEvent(webContents, {
    type: 'run_started',
    runId,
    conversationId,
  })

  try {
    const history = listMessagesForModel(conversationId)
    const modelHistory: Array<{ role: string; content?: string; toolCallId?: string }> = history.map(
      (message) => ({
        role: message.role,
        content: message.content,
        toolCallId: message.toolCallId,
      }),
    )

    let citations: ChatCitation[] = []
    const allToolSteps: ToolStepRecord[] = []
    let iteration = 0

    while (iteration < MAX_TOOL_ITERATIONS) {
      if (signal.aborted) {
        emitAgentEvent(webContents, {
          type: 'run_stopped',
          runId,
          conversationId,
        })
        finishAgentRun(runId, 'cancelled')
        break
      }

      iteration += 1

      const completionMessages = toOrchestratorCompletionMessages(modelHistory, {
        includeJsonPlanHint: shouldUseJsonPlan(config),
      })

      let assistantBuffer = ''

      const turn = await streamModelTurn(config, completionMessages, {
        enableTools: !shouldUseJsonPlan(config),
        signal,
        onDelta: (delta) => {
          assistantBuffer += delta
          emitAgentEvent(webContents, {
            type: 'assistant_delta',
            runId,
            conversationId,
            delta,
          })
        },
      })

      let toolCalls = turn.toolCalls

      if (toolCalls.length === 0 && shouldUseJsonPlan(config)) {
        toolCalls = extractJsonPlanToolCalls(turn.content || assistantBuffer)
      }

      if (toolCalls.length === 0) {
        const finalContent = (turn.content || assistantBuffer).trim() || '（无回复）'
        const messageId = insertMessage({
          conversationId,
          role: 'assistant',
          content: finalContent,
          meta: {
            citations,
            toolSteps: allToolSteps.length > 0 ? allToolSteps : undefined,
            model: config.model,
            providerId: profile.providerId,
          },
        })

        emitAgentEvent(webContents, {
          type: 'assistant_done',
          runId,
          conversationId,
          content: finalContent,
          messageId,
        })

        emitAgentEvent(webContents, {
          type: 'run_done',
          runId,
          conversationId,
          content: finalContent,
          messageId,
        })

        finishAgentRun(runId, 'completed')
        break
      }

      const toolSteps: ToolStepRecord[] = []

      if (turn.content || assistantBuffer) {
        modelHistory.push({
          role: 'assistant',
          content: turn.content || assistantBuffer,
        })
      }

      for (const toolCall of toolCalls) {
        const result = await executeToolWithApproval({
          toolCall,
          agentRunId: runId,
          conversationId,
          webContents,
          runId,
        })

        if (result.status === 'rejected' || result.status === 'failed') {
          const summary = result.error ?? result.result?.summary ?? '工具执行失败'
          insertMessage({
            conversationId,
            role: 'assistant',
            content: `已取消或失败：${summary}`,
          })

          emitAgentEvent(webContents, {
            type: 'run_error',
            runId,
            conversationId,
            error: summary,
          })

          finishAgentRun(runId, 'failed')
          clearRunAbortController(runId)
          return { runId, conversationId }
        }

        if (toolCall.name === 'search_files') {
          citations = mergeCitations(citations, extractCitationsFromSearchResult(result, citations.length + 1))
        }

        const toolSummary = result.result?.summary ?? '完成'

        const step: ToolStepRecord = {
          id: result.toolCallId,
          toolName: toolCall.name,
          status: 'completed',
          summary: toolSummary,
          input: parseToolArguments(toolCall.arguments),
        }

        toolSteps.push(step)
        allToolSteps.push(step)

        insertMessage({
          conversationId,
          role: 'tool',
          content: toolSummary,
          toolCallId: result.toolCallId,
        })

        modelHistory.push({
          role: 'user',
          content: `【工具 ${toolCall.name}】${toolSummary}`,
        })
      }
    }

    clearRunAbortController(runId)
    return { runId, conversationId }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    emitAgentEvent(webContents, {
      type: 'run_error',
      runId,
      conversationId,
      error: message,
    })

    finishAgentRun(runId, 'failed')
    clearRunAbortController(runId)

    throw error
  }
}

export function stopAgentRunById(runId: string) {
  return stopAgentRun(runId)
}

export function estimateConversationTokens(messages: ChatMessage[]) {
  return messages.reduce((sum, message) => sum + estimateTokens(message.content), 0)
}
