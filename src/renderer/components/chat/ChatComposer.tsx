import { useRef } from 'react'
import { Button, Card, Chip, Surface, TextArea, Typography } from '@heroui/react'
import { Paperclip, Send, Square } from 'lucide-react'
import type { AgentAttachment } from '../../../shared/types/agent'

interface ChatComposerProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onStop?: () => void
  sending: boolean
  attachments: AgentAttachment[]
  onAttachFiles: (files: AgentAttachment[]) => void
  onRemoveAttachment: (path: string) => void
}

export default function ChatComposer({
  value,
  onChange,
  onSend,
  onStop,
  sending,
  attachments,
  onAttachFiles,
  onRemoveAttachment,
}: ChatComposerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePickFiles = async () => {
    fileInputRef.current?.click()
  }

  return (
    <Surface className="shrink-0 border-t border-white/10 bg-[#1f1f1f] p-4" variant="transparent">
      <Card className="border border-white/10 bg-[#2a2a2a]">
        <Card.Content className="flex flex-col gap-3 p-3">
          {attachments.length > 0 && (
            <Surface className="flex flex-wrap gap-2" variant="transparent">
              {attachments.map((file) => (
                <Chip key={file.path} className="border border-white/10 gap-1 pr-1" variant="secondary">
                  {file.name}
                  <Button
                    isIconOnly
                    className="min-h-5 h-5 w-5 text-white/50"
                    size="sm"
                    variant="ghost"
                    onPress={() => onRemoveAttachment(file.path)}
                  >
                    ×
                  </Button>
                </Chip>
              ))}
            </Surface>
          )}

          <TextArea
            aria-label="输入消息"
            className="min-h-[72px] w-full resize-none border-0 bg-transparent text-white placeholder:text-white/40"
            placeholder="描述你的任务…（Shift+Enter 换行）"
            value={value}
            variant="secondary"
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                if (!sending) onSend()
              }
            }}
          />

          <Surface className="flex flex-wrap items-center justify-between gap-2" variant="transparent">
            <Surface className="flex items-center gap-2" variant="transparent">
              <Button
                className="border border-white/10 text-white"
                size="sm"
                variant="outline"
                onPress={() => void handlePickFiles()}
              >
                <Paperclip className="size-4" />
                附加文件
              </Button>
              <input
                ref={fileInputRef}
                multiple
                className="hidden"
                type="file"
                onChange={(event) => {
                  const files = [...(event.target.files ?? [])].map((file) => ({
                    path: (file as File & { path?: string }).path ?? file.name,
                    name: file.name,
                  }))
                  if (files.length > 0) onAttachFiles(files)
                  event.target.value = ''
                }}
              />
              <Typography className="!text-white/40" type="body-sm">
                附件会作为上下文传给模型
              </Typography>
            </Surface>

            <Surface className="flex items-center gap-2" variant="transparent">
              {sending && onStop && (
                <Button
                  className="border border-red-400/30 text-red-200"
                  size="sm"
                  variant="outline"
                  onPress={onStop}
                >
                  <Square className="size-4" />
                  停止
                </Button>
              )}
              <Button
                className="bg-blue-600 text-white hover:bg-blue-500"
                isDisabled={sending || (!value.trim() && attachments.length === 0)}
                variant="primary"
                onPress={onSend}
              >
                <Send className="size-4" />
                发送
              </Button>
            </Surface>
          </Surface>
        </Card.Content>
      </Card>
    </Surface>
  )
}
