import { useState } from 'react'
import { Button, Input, ScrollShadow, Avatar } from '@heroui/react'
import { Send } from 'lucide-react'
import type { ChatMessage } from '../../types/niuvis'

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    const content = input.trim()

    if (!content || sending) return

    const userMessage: ChatMessage = {
      id: createMessageId(),
      role: 'user',
      content,
    }
    const nextMessages = [...messages, userMessage]

    setMessages(nextMessages)
    setInput('')
    setSending(true)
    setError(null)

    try {
      if (!window.niuvisChat) {
        throw new Error('对话接口只在 Electron 窗口中可用')
      }

      const reply = await window.niuvisChat.send(nextMessages)

      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: reply,
        },
      ])
    } catch (err) {
      const message = err instanceof Error ? err.message : '发送失败'

      setError(message)
      setMessages((prev) => [
        ...prev,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `发送失败：${message}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex-1 flex flex-col h-screen bg-[#212121]">
      <ScrollShadow className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6 px-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60vh] text-gray-500">
              <h2 className="text-2xl font-semibold mb-2 text-white">Niuvis 对话</h2>
              <p>点击左下角设置按钮配置模型后即可开始对话。</p>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                >
                  {msg.role === 'assistant' && (
                    <Avatar className="bg-green-600 text-white shrink-0" size="sm">
                      <Avatar.Fallback>AI</Avatar.Fallback>
                    </Avatar>
                  )}
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#2f2f2f] text-gray-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <Avatar className="bg-blue-600 text-white shrink-0" size="sm">
                      <Avatar.Fallback>U</Avatar.Fallback>
                    </Avatar>
                  )}
                </div>
              ))}
              {sending && (
                <div className="flex gap-4">
                  <Avatar className="bg-green-600 text-white shrink-0" size="sm">
                    <Avatar.Fallback>AI</Avatar.Fallback>
                  </Avatar>
                  <div className="max-w-[70%] rounded-2xl bg-[#2f2f2f] px-4 py-3 text-gray-300">
                    <p>思考中...</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollShadow>

      <div className="border-t border-[#2f2f2f] bg-[#2f2f2f]">
        <div className="max-w-3xl mx-auto p-4">
          <div className="flex gap-3 items-end">
            <Input
              className="flex-1 border border-[#4a4a4a] bg-[#3a3a3a] text-white placeholder:text-white/40"
              placeholder="输入消息..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              variant="secondary"
            />
            <Button
              isIconOnly
              className="bg-blue-600 hover:bg-blue-700"
              onPress={handleSend}
              isDisabled={!input.trim() || sending}
            >
              <Send className="size-4" />
            </Button>
          </div>
          {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
        </div>
      </div>
    </div>
  )
}
