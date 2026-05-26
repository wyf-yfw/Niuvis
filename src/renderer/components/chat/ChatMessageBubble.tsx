import { Avatar, Button, Card, Surface } from '@heroui/react'
import type { ChatCitation, ChatMessage } from '../../../shared/types/chat'
import ChatMarkdown from './ChatMarkdown'
import ToolStepsCard from './ToolStepsCard'

interface ChatMessageBubbleProps {
  message: ChatMessage
  streaming?: boolean
  onCitationClick?: (citation: ChatCitation) => void
}

function AssistantMessageContent({
  content,
  citations,
  onCitationClick,
  streaming,
}: {
  content: string
  citations?: ChatCitation[]
  streaming?: boolean
  onCitationClick?: (citation: ChatCitation) => void
}) {
  if (!citations?.length) {
    return (
      <>
        <ChatMarkdown content={content} />
        {streaming && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
      </>
    )
  }

  const parts = content.split(/(\[\d+\])/g)

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null

        const match = part.match(/^\[(\d+)\]$/)

        if (match) {
          const citation = citations.find((item) => item.index === Number(match[1]))

          if (!citation) {
            return <span key={index}>{part}</span>
          }

          return (
            <Button
              key={index}
              className="mx-0.5 inline h-auto min-h-0 px-1 py-0 text-xs text-sky-300"
              size="sm"
              variant="ghost"
              onPress={() => onCitationClick?.(citation)}
            >
              [{citation.index}]
            </Button>
          )
        }

        return <ChatMarkdown key={index} content={part} />
      })}
      {streaming && <span className="ml-0.5 inline-block animate-pulse">▍</span>}
    </>
  )
}

export default function ChatMessageBubble({
  message,
  streaming = false,
  onCitationClick,
}: ChatMessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <Surface
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      variant="transparent"
    >
      {!isUser && (
        <Avatar className="mt-1 shrink-0 bg-emerald-600 text-white" size="sm">
          <Avatar.Fallback>AI</Avatar.Fallback>
        </Avatar>
      )}

      <Surface
        className={`flex max-w-[min(720px,85%)] flex-col gap-2 ${isUser ? 'items-end' : 'items-start'}`}
        variant="transparent"
      >
        {message.meta?.toolSteps && <ToolStepsCard steps={message.meta.toolSteps} />}

        <Card
          className={`rounded-2xl px-4 py-3 ${
            isUser ? 'bg-blue-600 text-white' : 'border border-white/10 bg-[#2f2f2f] text-gray-100'
          }`}
        >
          <Card.Content className="p-0">
            {isUser ? (
              <div className="whitespace-pre-wrap text-sm leading-6 text-inherit">{message.content}</div>
            ) : (
              <AssistantMessageContent
                citations={message.meta?.citations}
                content={message.content}
                streaming={streaming}
                onCitationClick={onCitationClick}
              />
            )}
          </Card.Content>
        </Card>

        {!isUser && message.meta?.citations && message.meta.citations.length > 0 && (
          <Surface className="flex flex-wrap gap-2" variant="transparent">
            {message.meta.citations.map((citation) => (
              <Button
                key={citation.path}
                className="h-auto min-h-0 border border-white/10 px-2 py-1 text-xs text-white/80"
                size="sm"
                variant="outline"
                onPress={() => onCitationClick?.(citation)}
              >
                [{citation.index}] {citation.label ?? citation.path}
              </Button>
            ))}
          </Surface>
        )}
      </Surface>

      {isUser && (
        <Avatar className="mt-1 shrink-0 bg-blue-600 text-white" size="sm">
          <Avatar.Fallback>U</Avatar.Fallback>
        </Avatar>
      )}
    </Surface>
  )
}
