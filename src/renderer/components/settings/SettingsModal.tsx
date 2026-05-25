import { useEffect, useMemo, useState } from 'react'
import { SettingsPortalProvider } from './SettingsPortalContext'
import { SETTINGS_DARK_CLASS, SETTINGS_DARK_THEME } from './settingsTheme'
import {
  Button,
  Label,
  Modal,
  ScrollShadow,
  Surface,
  Switch,
  Tabs,
  Typography,
  useOverlayState,
} from '@heroui/react'
import { FolderPlus, Plus, Trash2, Zap } from 'lucide-react'
import { getProviderPreset } from '../../../shared/constants/modelProviders'
import { formatIpcError } from '../../lib/ipcError'
import { getNonElectronHint } from '../../lib/runtime'
import type { AppSettings, ModelProfile, ModelProviderId } from '../../types/niuvis'
import {
  SettingsMessage,
  SettingsProfileGroup,
  SettingsProviderSelect,
  SettingsSection,
  SettingsTextAreaField,
  SettingsTextField,
} from './settingsUi'

interface SettingsModalProps {
  state: ReturnType<typeof useOverlayState>
}

function createProfileId() {
  return crypto.randomUUID()
}

function getActiveProfile(settings: AppSettings): ModelProfile {
  return (
    settings.profiles.find((profile) => profile.id === settings.activeProfileId) ??
    settings.profiles[0]
  )
}

export default function SettingsModal({ state }: SettingsModalProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [testResult, setTestResult] = useState<string | null>(null)
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null)

  const activeProfile = useMemo(
    () => (settings ? getActiveProfile(settings) : null),
    [settings],
  )

  useEffect(() => {
    if (!state.isOpen) return

    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      setHint(null)
      setTestResult(null)

      try {
        if (!window.niuvisSettings?.get) {
          throw new Error(getNonElectronHint())
        }

        const data = await window.niuvisSettings.get()

        if (!cancelled) {
          setSettings(data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(formatIpcError(err) || '读取设置失败')
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

  const updateSettings = (updater: (current: AppSettings) => AppSettings) => {
    setSettings((current) => (current ? updater(current) : current))
  }

  const updateActiveProfile = (updater: (profile: ModelProfile) => ModelProfile) => {
    if (!settings || !activeProfile) return

    updateSettings((current) => ({
      ...current,
      profiles: current.profiles.map((profile) =>
        profile.id === activeProfile.id ? updater(profile) : profile,
      ),
    }))
  }

  const handleProviderChange = (providerId: ModelProviderId) => {
    const preset = getProviderPreset(providerId)

    updateActiveProfile((profile) => ({
      ...profile,
      providerId,
      label: profile.label || preset.label,
      baseUrl: preset.defaultBaseUrl,
      model: profile.model || preset.defaultModel,
    }))
  }

  const handleAddProfile = () => {
    const preset = getProviderPreset('openai')
    const profile: ModelProfile = {
      id: createProfileId(),
      providerId: 'openai',
      label: `配置 ${settings ? settings.profiles.length + 1 : 1}`,
      apiKey: '',
      baseUrl: preset.defaultBaseUrl,
      model: preset.defaultModel,
    }

    updateSettings((current) => ({
      ...current,
      activeProfileId: profile.id,
      profiles: [...current.profiles, profile],
    }))
  }

  const handleRemoveProfile = (profileId: string) => {
    updateSettings((current) => {
      const profiles = current.profiles.filter((profile) => profile.id !== profileId)

      if (profiles.length === 0) {
        return current
      }

      return {
        ...current,
        profiles,
        activeProfileId:
          current.activeProfileId === profileId ? profiles[0].id : current.activeProfileId,
      }
    })
  }

  const handleAddRootPath = async () => {
    if (!window.niuvisSettings?.pickDirectory || !settings) return

    const picked = await window.niuvisSettings.pickDirectory()

    if (!picked || settings.index.rootPaths.includes(picked)) return

    updateSettings((current) => ({
      ...current,
      index: {
        ...current.index,
        rootPaths: [...current.index.rootPaths, picked],
      },
    }))
  }

  const handleTestConnection = async () => {
    if (!activeProfile || !window.niuvisSettings?.testConnection) return

    setTesting(true)
    setTestResult(null)
    setError(null)

    try {
      const result = await window.niuvisSettings.testConnection(activeProfile)

      setTestResult(
        result.ok
          ? `${result.message}${result.latencyMs ? `（${result.latencyMs}ms）` : ''}`
          : result.message,
      )
    } catch (err) {
      setTestResult(formatIpcError(err) || '测试失败')
    } finally {
      setTesting(false)
    }
  }

  const handleSave = async () => {
    if (!settings || !window.niuvisSettings?.save) return

    setSaving(true)
    setError(null)
    setHint(null)

    try {
      const saved = await window.niuvisSettings.save(settings)

      setSettings(saved)
      setHint('设置已保存到本机数据库')
      state.close()
    } catch (err) {
      setError(formatIpcError(err) || '保存失败')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal state={state}>
      <Modal.Backdrop className="bg-black/60 backdrop-blur-sm" isDismissable>
        <Modal.Container className="max-w-[560px]" placement="center" size="lg">
          <Modal.Dialog
            className={`${SETTINGS_DARK_CLASS} niuvis-settings-modal flex max-h-[min(88vh,720px)] flex-col overflow-hidden p-0 sm:max-w-[560px]`}
            {...SETTINGS_DARK_THEME}
          >
            <div
              ref={setPortalRoot}
              className="flex min-h-0 flex-1 flex-col"
            >
            <SettingsPortalProvider container={portalRoot}>
            <Modal.Header className="shrink-0 border-b border-border px-6 py-5">
              <Modal.Heading className="text-lg font-semibold tracking-tight">
                设置
              </Modal.Heading>
              <Typography.Paragraph className="mt-1 text-muted" size="sm">
                配置保存在本机，不会上传到服务器
              </Typography.Paragraph>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className="flex min-h-0 flex-1 flex-col px-6 py-5">
              {loading ? (
                <Surface
                  className="flex flex-1 items-center justify-center py-16"
                  variant="transparent"
                >
                  <Typography.Paragraph className="text-muted" size="sm">
                    加载中...
                  </Typography.Paragraph>
                </Surface>
              ) : !settings ? (
                <SettingsMessage tone="error">无法加载设置</SettingsMessage>
              ) : (
                <Tabs className="flex min-h-0 flex-1 flex-col" variant="secondary">
                  <Tabs.ListContainer className="shrink-0">
                    <Tabs.List aria-label="设置分类" className="w-full">
                      <Tabs.Tab id="model">模型</Tabs.Tab>
                      <Tabs.Tab id="index">
                        <Tabs.Separator />
                        索引与权限
                      </Tabs.Tab>
                      <Tabs.Tab id="history">
                        <Tabs.Separator />
                        历史与备份
                      </Tabs.Tab>
                    </Tabs.List>
                  </Tabs.ListContainer>

                  <ScrollShadow className="mt-4 min-h-0 flex-1" hideScrollBar={false}>
                    <Tabs.Panel id="model" className="space-y-4 pb-1">
                      <SettingsSection
                        title="模型配置档案"
                        description="可保存多套 API，随时切换"
                        action={
                          <Button size="sm" variant="secondary" onPress={handleAddProfile}>
                            <Plus className="size-3.5" />
                            新建
                          </Button>
                        }
                      >
                        <SettingsProfileGroup
                          profiles={settings.profiles.map((profile) => ({
                            id: profile.id,
                            label: profile.label,
                          }))}
                          activeProfileId={settings.activeProfileId}
                          onSelect={(profileId) =>
                            updateSettings((current) => ({
                              ...current,
                              activeProfileId: profileId,
                            }))
                          }
                        />

                        {activeProfile && (
                          <>
                            <SettingsProviderSelect
                              value={activeProfile.providerId}
                              onChange={handleProviderChange}
                            />

                            <SettingsTextField
                              label="显示名称"
                              value={activeProfile.label}
                              onChange={(event) =>
                                updateActiveProfile((profile) => ({
                                  ...profile,
                                  label: event.target.value,
                                }))
                              }
                            />

                            <SettingsTextField
                              label="API Key"
                              description="系统支持时将自动加密存储"
                              placeholder={
                                getProviderPreset(activeProfile.providerId).apiKeyPlaceholder
                              }
                              type="password"
                              value={activeProfile.apiKey}
                              onChange={(event) =>
                                updateActiveProfile((profile) => ({
                                  ...profile,
                                  apiKey: event.target.value,
                                }))
                              }
                            />

                            <SettingsTextField
                              label="API 地址"
                              value={activeProfile.baseUrl}
                              onChange={(event) =>
                                updateActiveProfile((profile) => ({
                                  ...profile,
                                  baseUrl: event.target.value,
                                }))
                              }
                            />

                            <SettingsTextField
                              label="模型名称"
                              placeholder="gpt-4o-mini / deepseek-chat"
                              value={activeProfile.model}
                              onChange={(event) =>
                                updateActiveProfile((profile) => ({
                                  ...profile,
                                  model: event.target.value,
                                }))
                              }
                            />

                            <Surface className="flex flex-wrap items-center gap-2" variant="transparent">
                              <Button
                                variant="primary"
                                onPress={() => void handleTestConnection()}
                                isDisabled={testing}
                              >
                                <Zap className="size-3.5" />
                                {testing ? '测试中...' : '测试连接'}
                              </Button>
                              {settings.profiles.length > 1 && (
                                <Button
                                  variant="danger"
                                  onPress={() => handleRemoveProfile(activeProfile.id)}
                                >
                                  <Trash2 className="size-3.5" />
                                  删除此档案
                                </Button>
                              )}
                            </Surface>

                            {testResult && (
                              <SettingsMessage
                                tone={testResult.includes('成功') ? 'success' : 'error'}
                              >
                                {testResult}
                              </SettingsMessage>
                            )}
                          </>
                        )}
                      </SettingsSection>
                    </Tabs.Panel>

                    <Tabs.Panel id="index" className="space-y-4 pb-1">
                      <SettingsSection
                        title="索引范围"
                        description="P2 索引器将扫描这些目录（默认包含用户主目录）"
                        action={
                          <Button
                            size="sm"
                            variant="secondary"
                            onPress={() => void handleAddRootPath()}
                          >
                            <FolderPlus className="size-3.5" />
                            添加
                          </Button>
                        }
                      >
                        {settings.index.rootPaths.length === 0 ? (
                          <Typography.Paragraph className="text-muted" size="sm">
                            尚未添加索引目录
                          </Typography.Paragraph>
                        ) : (
                          <Surface className="flex flex-col gap-2" variant="transparent">
                            {settings.index.rootPaths.map((rootPath) => (
                              <Surface
                                key={rootPath}
                                className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                                variant="transparent"
                              >
                                <Typography
                                  className="min-w-0 flex-1 truncate font-mono text-xs"
                                  type="body-xs"
                                >
                                  {rootPath}
                                </Typography>
                                <Button
                                  isIconOnly
                                  aria-label="移除目录"
                                  size="sm"
                                  variant="ghost"
                                  onPress={() =>
                                    updateSettings((current) => ({
                                      ...current,
                                      index: {
                                        ...current.index,
                                        rootPaths: current.index.rootPaths.filter(
                                          (path) => path !== rootPath,
                                        ),
                                      },
                                    }))
                                  }
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
                              </Surface>
                            ))}
                          </Surface>
                        )}

                        <SettingsTextAreaField
                          label="排除规则"
                          description="每行一条，支持 ** 通配符"
                          value={settings.index.excludePaths.join('\n')}
                          onChange={(event) =>
                            updateSettings((current) => ({
                              ...current,
                              index: {
                                ...current.index,
                                excludePaths: event.target.value
                                  .split('\n')
                                  .map((line) => line.trim())
                                  .filter(Boolean),
                              },
                            }))
                          }
                        />
                      </SettingsSection>

                      <SettingsSection
                        title="危险操作确认"
                        description="Agent 执行以下操作前将弹出确认"
                      >
                        <Surface
                          className="divide-y divide-border overflow-hidden rounded-xl border border-border"
                          variant="transparent"
                        >
                          {(
                            [
                              ['confirmDelete', '删除文件'],
                              ['confirmMove', '移动 / 重命名'],
                              ['confirmOverwrite', '覆盖写入'],
                              ['confirmExec', '执行命令'],
                              ['confirmSensitivePaths', '访问敏感目录'],
                            ] as const
                          ).map(([key, labelText]) => (
                            <Surface
                              key={key}
                              className="flex items-center justify-between gap-4 px-3 py-3"
                              variant="transparent"
                            >
                              <Switch
                                isSelected={settings.permissions[key]}
                                onChange={(selected) =>
                                  updateSettings((current) => ({
                                    ...current,
                                    permissions: {
                                      ...current.permissions,
                                      [key]: selected,
                                    },
                                  }))
                                }
                              >
                                <Switch.Control>
                                  <Switch.Thumb />
                                </Switch.Control>
                                <Switch.Content>
                                  <Label className="text-sm">{labelText}</Label>
                                </Switch.Content>
                              </Switch>
                            </Surface>
                          ))}
                        </Surface>
                      </SettingsSection>
                    </Tabs.Panel>

                    <Tabs.Panel id="history" className="space-y-4 pb-1">
                      <SettingsSection
                        title="保留策略"
                        description="到期数据将在后续版本自动清理"
                      >
                        <div className="grid gap-3 sm:grid-cols-2">
                          <SettingsTextField
                            label="对话保留（天）"
                            type="number"
                            value={String(settings.history.conversationRetentionDays)}
                            onChange={(event) =>
                              updateSettings((current) => ({
                                ...current,
                                history: {
                                  ...current.history,
                                  conversationRetentionDays: Number(event.target.value) || 0,
                                },
                              }))
                            }
                          />
                          <SettingsTextField
                            label="审计日志（天）"
                            type="number"
                            value={String(settings.history.auditRetentionDays)}
                            onChange={(event) =>
                              updateSettings((current) => ({
                                ...current,
                                history: {
                                  ...current.history,
                                  auditRetentionDays: Number(event.target.value) || 0,
                                },
                              }))
                            }
                          />
                        </div>

                        <SettingsTextField
                          label="备份目录"
                          description="留空则使用默认 userData/backups"
                          placeholder="/path/to/backups"
                          value={settings.history.backupPath}
                          onChange={(event) =>
                            updateSettings((current) => ({
                              ...current,
                              history: {
                                ...current.history,
                                backupPath: event.target.value,
                              },
                            }))
                          }
                        />
                      </SettingsSection>
                    </Tabs.Panel>
                  </ScrollShadow>
                </Tabs>
              )}

              {error && (
                <Surface className="mt-4 shrink-0" variant="transparent">
                  <SettingsMessage tone="error">{error}</SettingsMessage>
                </Surface>
              )}
              {hint && (
                <Surface className="mt-4 shrink-0" variant="transparent">
                  <SettingsMessage tone="success">{hint}</SettingsMessage>
                </Surface>
              )}
            </Modal.Body>

            <Modal.Footer className="shrink-0 border-t border-border px-6 py-4">
              <Surface className="flex w-full justify-end gap-2" variant="transparent">
                <Button variant="secondary" onPress={() => state.close()} isDisabled={saving}>
                  取消
                </Button>
                <Button
                  variant="primary"
                  onPress={() => void handleSave()}
                  isDisabled={loading || saving || !settings}
                >
                  {saving ? '保存中...' : '保存'}
                </Button>
              </Surface>
            </Modal.Footer>
            </SettingsPortalProvider>
            </div>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  )
}

export function useSettingsModalState() {
  return useOverlayState()
}
