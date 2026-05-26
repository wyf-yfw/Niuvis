import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Chip, Surface, Typography } from '@heroui/react'
import { ArrowDown, MessageSquare } from 'lucide-react'
import ChatMessageBubble from '../../components/chat/ChatMessageBubble'
import ChatComposer from '../../components/chat/ChatComposer'
import CitationPreviewModal from '../../components/chat/CitationPreviewModal'
import ToolConfirmCard from '../../components/confirm/ToolConfirmCard'
import { formatIpcError } from '../../lib/ipcError'
import { getNonElectronHint } from '../../lib/runtime'
import type { AgentAttachment, AgentRunHandle, AgentStreamEvent, FilePreviewResult } from '../../../shared/types/agent'
import type { ChatCitation, ChatMessage, ChatModelSettings } from '../../../shared/types/chat'
import type { PendingToolCall } from '../../../shared/types/tools'

const SCROLL_BOTTOM_THRESHOLD = 80

function estimateTokens(messages: ChatMessage[]) {
  const chars = messages.reduce((sum, message) => sum + message.content.length, 0)
  return Math.max(1, Math.ceil(chars / 4))
}

function isNearScrollBottom(element: HTMLElement, threshold = SCROLL_BOTTOM_THRESHOLD) {
  return element.scrollHeight - element.scrollTop - element.clientHeight <= threshold
}

export default function ChatPage() {
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [attachments, setAttachments] = useState<AgentAttachment[]>([])
  const [sending, setSending] = useState(false)
  const [activeRunId, setActiveRunId] = useState<string | null>(null)
  const [streamingContent, setStreamingContent] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingTools, setPendingTools] = useState<PendingToolCall[]>([])
  const [confirmBusy, setConfirmBusy] = useState(false)
  const [chatModel, setChatModel] = useState<ChatModelSettings | null>(null)
  const [previewCitation, setPreviewCitation] = useState<ChatCitation | null>(null)
  const [filePreview, setFilePreview] = useState<FilePreviewResult | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [bootstrapping, setBootstrapping] = useState(true)
  const [pinnedToBottom, setPinnedToBottom] = useState(true)

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const shouldAutoScrollRef = useRef(true)
  const activeRunIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeRunIdRef.current = activeRunId
  }, [activeRunId])

  const tokenEstimate = useMemo(() => estimateTokens(messages), [messages])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    const container = scrollContainerRef.current
    if (!container) return

    container.scrollTo({ top: container.scrollHeight, behavior })
  }, [])

  const syncScrollPinState = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const nearBottom = isNearScrollBottom(container)
    shouldAutoScrollRef.current = nearBottom
    setPinnedToBottom(nearBottom)
  }, [])

  const handleScroll = useCallback(() => {
    syncScrollPinState()
  }, [syncScrollPinState])

  const jumpToBottom = useCallback(() => {
    shouldAutoScrollRef.current = true
    setPinnedToBottom(true)
    scrollToBottom('smooth')
  }, [scrollToBottom])

  const loadConversation = useCallback(async (id: string) => {
    if (!window.niuvisConversations?.get) return

    const detail = await window.niuvisConversations.get(id)
    setConversationId(id)
    setMessages(detail.messages)
    setStreamingContent('')
    setError(null)
  }, [])

  const ensureSingleConversation = useCallback(async () => {
    if (!window.niuvisConversations?.list || !window.niuvisConversations?.create) {
      setBootstrapping(false)
      return
    }

    try {
      const list = await window.niuvisConversations.list()

      if (list.length > 0) {
        await loadConversation(list[0].id)
      } else {
        const created = await window.niuvisConversations.create('对话')
        await loadConversation(created.id)
      }
    } catch (err) {
      setError(formatIpcError(err) || '加载对话失败')
    } finally {
      setBootstrapping(false)
    }
  }, [loadConversation])

  const refreshPending = useCallback(async () => {
    if (!window.niuvisAgent?.pending) return

    try {
      const pending = await window.niuvisAgent.pending()
      setPendingTools(pending)
    } catch {
      // 轮询失败时静默
    }
  }, [])

  useEffect(() => {
    if (!window.niuvisSettings?.getChat) return

    void window.niuvisSettings.getChat().then(setChatModel).catch(() => undefined)
  }, [])

  useEffect(() => {
    void ensureSingleConversation()
  }, [ensureSingleConversation])

  useEffect(() => {
    void refreshPending()
    const timer = setInterval(() => {
      void refreshPending()
    }, 2500)

    return () => clearInterval(timer)
  }, [refreshPending])

  useEffect(() => {
    if (!window.niuvisAgent?.onStream) return

    const unsubscribe = window.niuvisAgent.onStream((event: AgentStreamEvent) => {
      if (activeRunIdRef.current && event.runId !== activeRunIdRef.current) {
        return
      }

      switch (event.type) {
        case 'assistant_delta':
          if (event.delta) {
            setStreamingContent((prev) => prev + event.delta)
          }
          break
        case 'tool_awaiting_approval':
          void refreshPending()
          break
        case 'assistant_done':
        case 'run_done':
          setStreamingContent('')
          setSending(false)
          setActiveRunId(null)
          if (event.conversationId) {
            void loadConversation(event.conversationId)
          }
          void refreshPending()
          break
        case 'run_error':
          setStreamingContent('')
          setSending(false)
          setActiveRunId(null)
          setError(event.error ?? '运行失败')
          if (event.conversationId) {
            void loadConversation(event.conversationId)
          }
          break
        case 'run_stopped':
          setStreamingContent('')
          setSending(false)
          setActiveRunId(null)
          if (event.conversationId) {
            void loadConversation(event.conversationId)
          }
          break
        default:
          break
      }
    })

    return unsubscribe
  }, [loadConversation, refreshPending])

  useEffect(() => {
    if (!shouldAutoScrollRef.current) return
    scrollToBottom(streamingContent ? 'auto' : 'smooth')
  }, [messages, streamingContent, pendingTools, scrollToBottom])

  const handleSend = async () => {
    const content = input.trim()

    if ((!content && attachments.length === 0) || sending || !conversationId) return

    if (!window.niuvisAgent?.run) {
      setError(getNonElectronHint())
      return
    }

    shouldAutoScrollRef.current = true
    setPinnedToBottom(true)

    setSending(true)
    setError(null)
    setInput('')
    const sentAttachments = [...attachments]
    setAttachments([])

    requestAnimationFrame(() => scrollToBottom('smooth'))

    try {
      const handle: AgentRunHandle = await window.niuvisAgent.run({
        conversationId,
        message: content,
        attachments: sentAttachments,
      })

      setActiveRunId(handle.runId)
      activeRunIdRef.current = handle.runId
      setStreamingContent('')

      await loadConversation(handle.conversationId)
    } catch (err) {
      setSending(false)
      setError(formatIpcError(err) || '发送失败')
    }
  }

  const handleStop = async () => {
    if (!activeRunId || !window.niuvisAgent?.stop) return

    await window.niuvisAgent.stop(activeRunId)
    setSending(false)
    setActiveRunId(null)
    setStreamingContent('')
  }

  const handleApprove = async (pending: PendingToolCall, rememberMinutes?: number) => {
    if (!window.niuvisAgent?.approve) return

    setConfirmBusy(true)
    setError(null)

    try {
      await window.niuvisAgent.approve({
        toolCallId: pending.id,
        rememberMinutes,
      })
      setPendingTools((items) => items.filter((item) => item.id !== pending.id))
    } catch (err) {
      setError(formatIpcError(err) || '确认失败')
    } finally {
      setConfirmBusy(false)
      void refreshPending()
    }
  }

  const handleReject = async (pending: PendingToolCall) => {
    if (!window.niuvisAgent?.reject) return

    setConfirmBusy(true)
    setError(null)

    try {
      await window.niuvisAgent.reject({ toolCallId: pending.id, reason: '用户已拒绝' })
      setPendingTools((items) => items.filter((item) => item.id !== pending.id))
    } catch (err) {
      setError(formatIpcError(err) || '拒绝失败')
    } finally {
      setConfirmBusy(false)
      void refreshPending()
    }
  }

  const handleCitationClick = async (citation: ChatCitation) => {
    setPreviewCitation(citation)
    setPreviewOpen(true)
    setFilePreview(null)

    if (!window.niuvisAgent?.previewFile) return

    try {
      const preview = await window.niuvisAgent.previewFile(citation.path)
      setFilePreview(preview)
    } catch {
      setFilePreview(null)
    }
  }

  const streamingMessage: ChatMessage | null =
    streamingContent.trim().length > 0
      ? {
          id: 'streaming',
          role: 'assistant',
          content: streamingContent,
        }
      : null

  return (
    <Surface className="flex h-screen flex-1 flex-col bg-[#212121]" variant="transparent">
      <Surface
        className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3"
        variant="transparent"
      >
        <MessageSquare className="size-5 shrink-0 text-white/70" />
        <Typography className="font-medium !text-white" type="body-sm">
          Niuvis 对话
        </Typography>
        {chatModel?.model && (
          <Chip className="border border-white/10" size="sm" variant="secondary">
            {chatModel.model}
          </Chip>
        )}
        <Chip className="border border-white/10" size="sm" variant="soft">
          ~{tokenEstimate} tokens
        </Chip>
      </Surface>

      <Surface className="relative min-h-0 flex-1" variant="transparent">
        <div
          ref={scrollContainerRef}
          className="niuvis-chat-scroll h-full overflow-y-auto"
          onScroll={handleScroll}
        >
          <Surface className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-6" variant="transparent">
          {bootstrapping && (
            <Typography className="text-center !text-white/45" type="body-sm">
              加载对话中…
            </Typography>
          )}

          {!bootstrapping && messages.length === 0 && !streamingMessage && pendingTools.length === 0 && (
            <Surface
              className="flex h-[50vh] flex-col items-center justify-center gap-2"
              variant="transparent"
            >
              <Typography className="text-2xl font-semibold !text-white" type="body-sm">
                开始对话
              </Typography>
              <Typography className="text-center !text-white/50" type="body-sm">
                在设置中配置模型后，可搜索文件、整理目录并让 Agent 自动调用工具。
              </Typography>
            </Surface>
          )}

          {pendingTools.map((pending) => (
            <ToolConfirmCard
              key={pending.id}
              busy={confirmBusy}
              pending={pending}
              onApprove={(rememberMinutes) => void handleApprove(pending, rememberMinutes)}
              onReject={() => void handleReject(pending)}
            />
          ))}

          {messages
            .filter((message) => message.role === 'user' || message.role === 'assistant')
            .map((message) => (
              <ChatMessageBubble
                key={message.id}
                message={message}
                onCitationClick={(citation) => void handleCitationClick(citation)}
              />
            ))}

          {streamingMessage && (
            <ChatMessageBubble message={streamingMessage} streaming onCitationClick={undefined} />
          )}

          </Surface>
        </div>

        {!pinnedToBottom && (
          <Button
            className="absolute bottom-4 right-6 border border-white/15 bg-[#2f2f2f] text-white shadow-lg"
            size="sm"
            variant="secondary"
            onPress={jumpToBottom}
          >
            <ArrowDown className="size-4" />
            回到底部
          </Button>
        )}
      </Surface>

      {error && (
        <Typography className="px-4 pb-2 !text-red-300" type="body-sm">
          {error}
        </Typography>
      )}

      <ChatComposer
        attachments={attachments}
        sending={sending || bootstrapping}
        value={input}
        onAttachFiles={(files) => setAttachments((prev) => [...prev, ...files])}
        onChange={setInput}
        onRemoveAttachment={(path) =>
          setAttachments((prev) => prev.filter((file) => file.path !== path))
        }
        onSend={() => void handleSend()}
        onStop={() => void handleStop()}
      />

      <CitationPreviewModal
        citation={previewCitation}
        isOpen={previewOpen}
        preview={filePreview}
        onClose={() => {
          setPreviewOpen(false)
          setPreviewCitation(null)
        }}
      />
    </Surface>
  )
}
