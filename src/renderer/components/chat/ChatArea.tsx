import { useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import {
  Avatar,
  Button,
  Card,
  Chip,
  Separator,
  ScrollShadow,
  Surface,
  TextArea,
  Tooltip,
  Typography,
} from '@heroui/react'

interface Capability {
  label: string
  description: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: string
}

const promptSuggestions = [
  '帮我检查电脑空间并找出可清理的大文件',
  '总结桌面上的最新文档',
  '打开常用办公应用并准备今天的工作区',
  '搜索最近的 AI 桌面助手方案并整理对比',
]

interface ChatAreaProps {
  conversationTitle: string
  capability: Capability
  messages: Message[]
  onSend: (message: string) => void
}

export default function ChatArea({
  conversationTitle,
  capability,
  messages,
  onSend,
}: ChatAreaProps) {
  const [input, setInput] = useState('')
  const hasUserMessage = useMemo(
    () => messages.some((message) => message.role === 'user'),
    [messages],
  )

  const handleSend = () => {
    const message = input.trim()

    if (!message) return

    onSend(message)
    setInput('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const useSuggestion = (suggestion: string) => {
    setInput(suggestion)
  }

  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#f7f7f4]" variant="transparent">
      <Surface
        className="flex h-16 shrink-0 items-center justify-between border-b border-black/10 bg-[#f7f7f4]/90 px-5 backdrop-blur"
        variant="transparent"
      >
        <Surface className="min-w-0" variant="transparent">
          <Surface className="flex items-center gap-2" variant="transparent">
            <Typography className="truncate text-base font-semibold text-[#202123]" type="h6">
              {conversationTitle}
            </Typography>
            <Chip className="bg-[#10a37f]/10 text-[#0b6b54]" size="sm" variant="soft">
              {capability.label}
            </Chip>
          </Surface>
          <Typography className="truncate text-xs text-black/45" type="body-xs">
            {capability.description}
          </Typography>
        </Surface>

        <Surface className="flex items-center gap-2" variant="transparent">
          <Chip className="bg-black/[0.04] text-black/55" size="sm" variant="soft">
            本地优先
          </Chip>
          <Button
            className="rounded-xl border border-black/10 bg-white px-3 text-sm text-black/70 shadow-sm"
            variant="secondary"
          >
            设置
          </Button>
        </Surface>
      </Surface>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto" hideScrollBar>
        <Surface className="mx-auto flex w-full max-w-4xl flex-col px-5 py-8" variant="transparent">
          {!hasUserMessage && (
            <Surface className="mb-8" variant="transparent">
              <Surface className="mb-7 max-w-2xl" variant="transparent">
                <Avatar className="mb-4 size-12 rounded-2xl bg-[#10a37f] text-lg font-semibold text-white shadow-lg shadow-[#10a37f]/20">
                  <Avatar.Fallback>N</Avatar.Fallback>
                </Avatar>
                <Typography.Heading
                  className="text-3xl font-semibold tracking-normal text-[#202123]"
                  level={2}
                >
                  今天要让电脑帮你完成什么？
                </Typography.Heading>
                <Typography.Paragraph className="mt-3 max-w-xl text-sm leading-6 text-black/55" size="sm">
                  选择一种能力或直接输入任务。Niuvis 会把请求拆给系统、文件、应用和搜索 Agent。
                </Typography.Paragraph>
              </Surface>

              <Surface className="grid gap-3 sm:grid-cols-2" variant="transparent">
                {promptSuggestions.map((suggestion) => (
                  <Card
                    key={suggestion}
                    className="rounded-2xl border border-black/10 bg-white p-4 text-left shadow-sm transition hover:border-[#10a37f]/30 hover:shadow-md"
                    variant="default"
                  >
                    <Button
                      className="w-full text-left text-sm leading-6 text-black/70"
                      variant="ghost"
                      onPress={() => useSuggestion(suggestion)}
                    >
                      {suggestion}
                    </Button>
                  </Card>
                ))}
              </Surface>
            </Surface>
          )}

          <Surface className="flex flex-col gap-7" variant="transparent">
            {messages.map((msg) => {
              const isUser = msg.role === 'user'

              return (
                <Surface
                  key={msg.id}
                  className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
                  variant="transparent"
                >
                  {!isUser && (
                    <Avatar className="mt-1 shrink-0 bg-[#10a37f] text-white" size="sm">
                      <Avatar.Fallback>N</Avatar.Fallback>
                    </Avatar>
                  )}

                  <Surface
                    className={`flex max-w-[78%] flex-col ${isUser ? 'items-end' : ''}`}
                    variant="transparent"
                  >
                    {!isUser && msg.meta && (
                      <Typography className="mb-2 text-xs font-medium text-black/45" type="body-xs">
                        {msg.meta}
                      </Typography>
                    )}
                    <Card
                      className={`rounded-3xl px-4 py-3 shadow-sm ${
                        isUser
                          ? 'bg-[#303030] text-white'
                          : 'border border-black/10 bg-white text-[#202123]'
                      }`}
                    >
                      <Card.Content className="p-0">
                        <Typography.Paragraph className="whitespace-pre-wrap text-sm leading-6" size="sm">
                          {msg.content}
                        </Typography.Paragraph>
                      </Card.Content>
                    </Card>
                    {!isUser && (
                      <Surface className="mt-2 flex items-center gap-1" variant="transparent">
                        {['复制', '重试', '更多'].map((action) => (
                          <Button
                            key={action}
                            className="h-7 rounded-lg bg-transparent px-2 text-xs text-black/45 hover:bg-black/[0.04]"
                            variant="ghost"
                          >
                            {action}
                          </Button>
                        ))}
                      </Surface>
                    )}
                  </Surface>

                  {isUser && (
                    <Avatar className="mt-1 shrink-0 bg-[#303030] text-white" size="sm">
                      <Avatar.Fallback>U</Avatar.Fallback>
                    </Avatar>
                  )}
                </Surface>
              )
            })}
          </Surface>
        </Surface>
      </ScrollShadow>

      <Surface className="shrink-0 bg-[#f7f7f4]/95 px-5 py-4 backdrop-blur" variant="transparent">
        <Separator className="absolute left-0 right-0 top-0 bg-black/10" />
        <Surface className="mx-auto max-w-4xl" variant="transparent">
          <Card className="rounded-3xl border border-black/10 bg-white p-3 shadow-[0_18px_60px_rgba(0,0,0,0.08)]">
            <Card.Content className="p-0">
              <TextArea
                aria-label="Niuvis 任务输入"
                className="min-h-[52px] w-full resize-none border-0 bg-transparent px-2 py-2 text-sm leading-6 text-[#202123] outline-none placeholder:text-black/35"
                placeholder={`向 Niuvis 描述一个${capability.label}任务...`}
                rows={2}
                value={input}
                variant="secondary"
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={handleKeyDown}
              />
            </Card.Content>

            <Card.Footer className="flex flex-wrap items-center justify-between gap-3 p-0 pt-2">
              <Surface className="flex items-center gap-2" variant="transparent">
                {['附件', '截图', '本地'].map((action) => (
                  <Tooltip key={action}>
                    <Tooltip.Trigger>
                      <Button
                        className="h-8 rounded-xl border border-black/10 bg-white px-3 text-xs text-black/55 hover:bg-black/[0.03]"
                        variant="secondary"
                      >
                        {action}
                      </Button>
                    </Tooltip.Trigger>
                    <Tooltip.Content className="rounded-lg bg-[#303030] px-3 py-2 text-xs text-white shadow-xl">
                      {action}能力入口
                    </Tooltip.Content>
                  </Tooltip>
                ))}
              </Surface>

              <Surface className="flex items-center gap-2" variant="transparent">
                <Chip className="bg-black/[0.04] text-black/45" size="sm" variant="soft">
                  Shift + Enter 换行
                </Chip>
                <Button
                  className="h-10 rounded-2xl bg-[#10a37f] px-5 text-sm font-medium text-white hover:bg-[#0e8f70] disabled:opacity-40"
                  isDisabled={!input.trim()}
                  variant="primary"
                  onPress={handleSend}
                >
                  发送
                </Button>
              </Surface>
            </Card.Footer>
          </Card>
          <Typography.Paragraph className="mt-3 text-center text-xs text-black/35" size="xs">
            当前为前端原型，系统操作和模型调用将在主进程中执行。
          </Typography.Paragraph>
        </Surface>
      </Surface>
    </Surface>
  )
}
