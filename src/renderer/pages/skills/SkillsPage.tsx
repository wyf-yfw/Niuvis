import { useCallback, useEffect, useMemo, useState } from 'react'
import { Button, Card, Chip, Input, Surface, Typography } from '@heroui/react'
import { formatIpcError } from '../../lib/ipcError'
import { getNonElectronHint } from '../../lib/runtime'
import type { ToolDefinitionSummary, ToolRiskLevel } from '../../../shared/types/tools'

const RISK_ORDER: ToolRiskLevel[] = ['low', 'medium', 'high']

const RISK_LABELS: Record<ToolRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const RISK_COLORS: Record<ToolRiskLevel, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
}

function agentForTool(name: string) {
  if (name.includes('app') || name === 'launch_app') return 'App Agent'
  if (name.includes('search') || name === 'web_search') return 'Search Agent'
  if (name.includes('system') || name === 'get_system_info') return 'Sys Agent'
  return 'File Agent'
}

export default function SkillsPage() {
  const [tools, setTools] = useState<ToolDefinitionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTool, setActiveTool] = useState<ToolDefinitionSummary | null>(null)
  const [inputJson, setInputJson] = useState('{}')
  const [running, setRunning] = useState(false)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const loadTools = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (!window.niuvisTools?.list) {
        throw new Error(getNonElectronHint())
      }

      const list = await window.niuvisTools.list()
      setTools(list)
    } catch (err) {
      setError(formatIpcError(err) || '加载工具列表失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTools()
  }, [loadTools])

  const grouped = useMemo(() => {
    const map = new Map<ToolRiskLevel, ToolDefinitionSummary[]>()

    for (const level of RISK_ORDER) {
      map.set(level, [])
    }

    for (const tool of tools) {
      map.get(tool.riskLevel)?.push(tool)
    }

    return map
  }, [tools])

  const runTool = async () => {
    if (!activeTool || !window.niuvisTools?.invoke) return

    setRunning(true)
    setError(null)
    setLastResult(null)

    try {
      const input = JSON.parse(inputJson) as unknown
      const result = await window.niuvisTools.invoke({
        toolName: activeTool.name,
        input,
      })

      setLastResult(JSON.stringify(result, null, 2))

      if (result.status === 'awaiting_approval') {
        setLastResult('已提交，等待在「对话」页确认后执行。')
      }
    } catch (err) {
      setError(formatIpcError(err) || '执行失败')
    } finally {
      setRunning(false)
    }
  }

  return (
    <Surface className="h-screen flex-1 overflow-y-auto bg-[#212121] p-6 !text-white" variant="transparent">
      <Surface className="mx-auto max-w-5xl" variant="transparent">
        <Surface className="mb-6 flex flex-wrap items-center justify-between gap-3" variant="transparent">
          <Surface variant="transparent">
            <Typography.Heading className="text-2xl font-bold !text-white" level={1}>
              技能大全
            </Typography.Heading>
            <Typography.Paragraph className="mt-1 !text-white/50" size="sm">
              基于 Tool Registry 自动渲染 · 共 {tools.length} 个工具
            </Typography.Paragraph>
          </Surface>
          <Button className="border border-white/15 text-white" variant="outline" onPress={() => void loadTools()}>
            刷新
          </Button>
        </Surface>

        {error && (
          <Surface className="mb-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100" variant="transparent">
            {error}
          </Surface>
        )}

        {lastResult && (
          <Surface className="mb-4 rounded-lg border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100 whitespace-pre-wrap" variant="transparent">
            {lastResult}
          </Surface>
        )}

        {activeTool && (
          <Card className="mb-6 border border-white/12 bg-[#2a2a2a]">
            <Card.Content className="flex flex-col gap-3 p-4">
              <Typography className="font-semibold !text-white" type="body-md">
                试运行：{activeTool.name}
              </Typography>
              <Input
                aria-label="工具参数 JSON"
                className="font-mono text-sm text-white"
                value={inputJson}
                variant="secondary"
                onChange={(event) => setInputJson(event.target.value)}
              />
              <Surface className="flex gap-2" variant="transparent">
                <Button className="bg-white text-black" isDisabled={running} variant="primary" onPress={() => void runTool()}>
                  {running ? '执行中…' : '执行'}
                </Button>
                <Button className="text-white/70" variant="ghost" onPress={() => setActiveTool(null)}>
                  关闭
                </Button>
              </Surface>
            </Card.Content>
          </Card>
        )}

        {loading ? (
          <Typography className="!text-white/50" type="body-md">
            加载中…
          </Typography>
        ) : (
          RISK_ORDER.map((level) => {
            const items = grouped.get(level) ?? []

            if (items.length === 0) return null

            return (
              <Surface key={level} className="mb-8" variant="transparent">
                <Typography.Heading className="mb-3 text-lg !text-white" level={2}>
                  {RISK_LABELS[level]}（{items.length}）
                </Typography.Heading>
                <Surface className="grid grid-cols-1 gap-4 md:grid-cols-2" variant="transparent">
                  {items.map((tool) => (
                    <Card key={tool.name} className="border border-[#3a3a3a] bg-[#2a2a2a]">
                      <Card.Content className="p-4">
                        <Surface className="mb-3 flex items-start justify-between gap-2" variant="transparent">
                          <Typography className="font-mono text-sm text-blue-300" type="body-sm">
                            {tool.name}
                          </Typography>
                          <Chip color={RISK_COLORS[tool.riskLevel]} size="sm" variant="soft">
                            {tool.requiresConfirmation ? '需确认' : '自动'}
                          </Chip>
                        </Surface>
                        <Typography className="mb-2 font-semibold !text-white" type="body-md">
                          {tool.description}
                        </Typography>
                        <Typography className="mb-3 !text-white/45" type="body-sm">
                          {agentForTool(tool.name)}
                        </Typography>
                        <Button
                          className="text-blue-400"
                          size="sm"
                          variant="ghost"
                          onPress={() => {
                            setActiveTool(tool)
                            setInputJson('{}')
                            setLastResult(null)
                          }}
                        >
                          试运行
                        </Button>
                      </Card.Content>
                    </Card>
                  ))}
                </Surface>
              </Surface>
            )
          })
        )}
      </Surface>
    </Surface>
  )
}
