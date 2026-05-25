import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Chip, Input, ScrollShadow, Surface, Typography } from '@heroui/react'
import IndexStatusChip from '../../components/index/IndexStatusChip'
import { formatIpcError } from '../../lib/ipcError'
import { indexItemToInstalledApp } from '../../lib/indexMappers'
import type { PageNavigationIntent } from '../../lib/pageNavigation'
import { getNonElectronHint } from '../../lib/runtime'
import type { InstalledApp } from '../../types/niuvis'

function getAppInitial(name: string) {
  return name.trim().charAt(0).toUpperCase() || 'A'
}

function getCategoryLabel(category?: string) {
  const labels: Record<string, string> = {
    AudioVideo: '影音',
    Development: '开发',
    Graphics: '图形',
    Network: '网络',
    Office: '办公',
    System: '系统',
    Utility: '工具',
  }

  return labels[category ?? ''] ?? category ?? '应用'
}

function AppIcon({ app }: { app: InstalledApp }) {
  const [failed, setFailed] = useState(false)
  const hasUsableIcon = Boolean(app.iconDataUrl?.startsWith('data:image/'))

  if (hasUsableIcon && !failed) {
    return (
      <Surface className="flex size-full items-center justify-center bg-white/5" variant="transparent">
        <img
          alt=""
          className="block h-10 w-10 object-contain"
          draggable={false}
          src={app.iconDataUrl}
          onError={() => setFailed(true)}
        />
      </Surface>
    )
  }

  return (
    <Surface className="flex size-full items-center justify-center bg-white/5" variant="transparent">
      <span className="text-xl font-semibold text-white">{getAppInitial(app.name)}</span>
    </Surface>
  )
}

interface AppsPageProps {
  navigationIntent?: PageNavigationIntent
  onNavigationIntentConsumed?: () => void
}

export default function AppsPage({ navigationIntent, onNavigationIntentConsumed }: AppsPageProps) {
  const [apps, setApps] = useState<InstalledApp[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'cache' | 'scan' | 'index' | null>(null)

  const loadApps = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      if (!window.niuvisApps) {
        throw new Error(getNonElectronHint())
      }

      if (!forceRefresh && window.niuvisIndex) {
        const status = await window.niuvisIndex.status()

        if (status.itemCount > 0) {
          const indexed = await window.niuvisIndex.list({ kind: 'app', limit: 200 })

          if (indexed.items.length > 0) {
            setApps(indexed.items.map(indexItemToInstalledApp))
            setDataSource('index')
            return
          }
        }
      }

      const result = await window.niuvisApps.listInstalled({ forceRefresh })
      setApps(result.apps)
      setDataSource(result.source)
    } catch (err) {
      setError(formatIpcError(err) || '读取已安装应用失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadApps()
  }, [])

  useEffect(() => {
    if (!navigationIntent) return

    if (navigationIntent.searchQuery) {
      setQuery(navigationIntent.searchQuery)
    }

    onNavigationIntentConsumed?.()
  }, [navigationIntent, onNavigationIntentConsumed])

  const filteredApps = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()

    if (!keyword) return apps

    return apps.filter((app) =>
      [app.name, app.description, app.category, app.source]
        .filter(Boolean)
        .some((value) => value!.toLocaleLowerCase().includes(keyword)),
    )
  }, [apps, query])

  const openApp = async (app: InstalledApp) => {
    if (!window.niuvisApps) return

    setOpeningId(app.id)
    setError(null)

    try {
      await window.niuvisApps.open(app)
    } catch (err) {
      setError(formatIpcError(err) ? `无法打开 ${app.name}：${formatIpcError(err)}` : `无法打开 ${app.name}`)
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#212121] !text-white" variant="transparent">
      <Surface
        className="flex shrink-0 flex-col gap-4 border-b border-white/8 bg-[#212121]/95 px-6 py-5 backdrop-blur"
        variant="transparent"
      >
        <Surface className="flex flex-wrap items-center justify-between gap-4" variant="transparent">
          <Surface variant="transparent">
            <Typography.Heading className="text-2xl font-semibold tracking-normal !text-white" level={1}>
              应用
            </Typography.Heading>
            <Typography.Paragraph className="mt-1 !text-white/50" size="sm">
              从这台电脑读取到 {apps.length} 个已安装程序
              {dataSource === 'index'
                ? ' · 来自本地索引'
                : dataSource === 'cache'
                  ? ' · 已使用缓存'
                  : dataSource === 'scan'
                    ? ' · 已重新扫描'
                    : ''}
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex items-center gap-3" variant="transparent">
            <IndexStatusChip onIndexCompleted={() => void loadApps(true)} />
            <Input
              aria-label="搜索应用"
              className="w-72 border border-white/10 bg-[#2a2a2a] text-white placeholder:text-white/40"
              placeholder="搜索应用..."
              value={query}
              variant="secondary"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              className="border border-white/10 bg-[#2a2a2a] text-white hover:bg-[#333333]"
              variant="outline"
              onPress={() => loadApps(true)}
            >
              刷新
            </Button>
          </Surface>
        </Surface>

        {error && (
          <Surface
            className="rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100"
            variant="transparent"
          >
            {error}
          </Surface>
        )}
      </Surface>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-6 py-6" hideScrollBar>
        {loading ? (
          <Surface className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" variant="transparent">
            {Array.from({ length: 18 }).map((_, index) => (
              <Card key={index} className="h-[148px] animate-pulse border border-white/8 bg-[#2a2a2a]">
                <Card.Content className="flex h-full flex-col items-center justify-center gap-3 p-4">
                  <div className="size-14 rounded-2xl bg-white/10" />
                  <div className="h-3 w-20 rounded bg-white/10" />
                  <div className="h-2 w-12 rounded bg-white/8" />
                </Card.Content>
              </Card>
            ))}
          </Surface>
        ) : filteredApps.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              没有找到应用
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              换一个关键词，或者点击刷新重新读取系统应用列表。
            </Typography.Paragraph>
          </Surface>
        ) : (
          <Surface className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6" variant="transparent">
            {filteredApps.map((app) => (
              <Card
                key={`${app.source}-${app.id}`}
                className="group h-[148px] cursor-pointer border border-white/8 bg-[#2a2a2a] transition hover:border-white/18 hover:bg-[#333333]"
                role="button"
                tabIndex={0}
                onDoubleClick={() => void openApp(app)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') void openApp(app)
                }}
              >
                <Card.Content className="flex h-full flex-col items-center justify-center p-4 text-center">
                  <Surface
                    className="mb-3 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-white/8 bg-[#3a3a3a] shadow-lg shadow-black/15"
                    variant="transparent"
                  >
                    <AppIcon app={app} />
                  </Surface>

                  <Typography className="line-clamp-2 min-h-9 max-w-full text-sm font-medium leading-[18px] !text-white" type="body-sm">
                    {app.name}
                  </Typography>

                  <Surface className="mt-2 flex items-center justify-center gap-2" variant="transparent">
                    <Chip className="bg-white/[0.07] !text-white/55" size="sm" variant="soft">
                      {getCategoryLabel(app.category)}
                    </Chip>
                  </Surface>

                  <Button
                    className="absolute bottom-2 left-2 right-2 h-8 translate-y-1 rounded-lg bg-white text-xs text-black opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100"
                    isDisabled={openingId === app.id}
                    variant="secondary"
                    onPress={() => void openApp(app)}
                  >
                    {openingId === app.id ? '打开中' : '打开'}
                  </Button>
                </Card.Content>
              </Card>
            ))}
          </Surface>
        )}
      </ScrollShadow>
    </Surface>
  )
}
