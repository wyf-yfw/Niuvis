import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Modal,
  Surface,
  Typography,
  useOverlayState,
} from '@heroui/react'
import type { ChatModelSettings } from '../../types/niuvis'

interface SettingsModalProps {
  state: ReturnType<typeof useOverlayState>
}

const fieldClassName =
  'border border-white/12 bg-[#1c1c1c] text-sm !text-white placeholder:!text-white/40'

export default function SettingsModal({ state }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://api.openai.com/v1')
  const [model, setModel] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)

  useEffect(() => {
    if (!state.isOpen) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setSavedHint(null)

      try {
        if (!window.niuvisSettings) {
          throw new Error('设置接口只在 Electron 窗口中可用')
        }

        const settings = await window.niuvisSettings.getChat()

        if (cancelled) return

        setApiKey(settings.apiKey)
        setBaseUrl(settings.baseUrl)
        setModel(settings.model)
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : '读取设置失败')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [state.isOpen])

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSavedHint(null)

    try {
      if (!window.niuvisSettings) {
        throw new Error('设置接口只在 Electron 窗口中可用')
      }

      const payload: ChatModelSettings = {
        apiKey: apiKey.trim(),
        baseUrl: baseUrl.trim(),
        model: model.trim(),
      }

      if (!payload.apiKey) {
        throw new Error('请填写 API Key')
      }

      if (!payload.model) {
        throw new Error('请填写模型名称')
      }

      await window.niuvisSettings.saveChat(payload)
      setSavedHint('已保存，对话页将使用此配置')
      state.close()
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-black/60" isDismissable>
        <Modal.Container className="max-w-lg" placement="center" size="md">
          <Modal.Dialog className="border border-white/10 bg-[#1f1f1f] !text-white shadow-2xl">
            <Modal.Header className="border-b border-white/8 px-5 py-4">
              <Modal.Heading className="text-base font-semibold !text-white">模型设置</Modal.Heading>
              <Modal.CloseTrigger className="!text-white/60 hover:!text-white" />
            </Modal.Header>

            <Modal.Body className="space-y-4 px-5 py-4">
              <Typography.Paragraph className="!text-white/55" size="sm">
                支持 OpenAI 兼容接口（OpenAI、DeepSeek、Ollama 等）。配置保存在本机，不会上传到 Niuvis 服务器。
              </Typography.Paragraph>

              {loading ? (
                <Typography.Paragraph className="!text-white/50" size="sm">
                  加载中...
                </Typography.Paragraph>
              ) : (
                <Surface className="space-y-3" variant="transparent">
                  <Surface className="space-y-1.5" variant="transparent">
                    <Typography className="!text-xs !text-white/70" type="body-xs">
                      API Key
                    </Typography>
                    <Input
                      className={fieldClassName}
                      placeholder="sk-..."
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      variant="secondary"
                    />
                  </Surface>

                  <Surface className="space-y-1.5" variant="transparent">
                    <Typography className="!text-xs !text-white/70" type="body-xs">
                      API 地址
                    </Typography>
                    <Input
                      className={fieldClassName}
                      placeholder="https://api.openai.com/v1"
                      value={baseUrl}
                      onChange={(event) => setBaseUrl(event.target.value)}
                      variant="secondary"
                    />
                  </Surface>

                  <Surface className="space-y-1.5" variant="transparent">
                    <Typography className="!text-xs !text-white/70" type="body-xs">
                      模型名称
                    </Typography>
                    <Input
                      className={fieldClassName}
                      placeholder="gpt-4o / deepseek-chat / qwen2.5"
                      value={model}
                      onChange={(event) => setModel(event.target.value)}
                      variant="secondary"
                    />
                  </Surface>
                </Surface>
              )}

              {error && <p className="text-xs text-red-300">{error}</p>}
              {savedHint && <p className="text-xs text-emerald-300">{savedHint}</p>}
            </Modal.Body>

            <Modal.Footer className="border-t border-white/8 px-5 py-4">
              <Button
                className="!text-white/70"
                variant="ghost"
                onPress={() => state.close()}
                isDisabled={saving}
              >
                取消
              </Button>
              <Button
                className="bg-blue-600 text-white hover:bg-blue-700"
                onPress={() => void handleSave()}
                isDisabled={loading || saving}
              >
                {saving ? '保存中...' : '保存'}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export function useSettingsModalState() {
  return useOverlayState()
}
