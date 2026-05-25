import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, Card, Chip, Input, ScrollShadow, Surface, Typography } from '@heroui/react'
import IndexBrowseFooter from '../../components/index/IndexBrowseFooter'
import IndexStatusChip from '../../components/index/IndexStatusChip'
import LibraryIndexViewSwitch, { type LibraryViewSource } from '../../components/library/LibraryIndexViewSwitch'
import { usePaginatedIndexBrowse } from '../../hooks/usePaginatedIndexBrowse'
import { formatIpcError } from '../../lib/ipcError'
import { INDEX_PAGE_SIZE } from '../../lib/indexBrowse'
import { indexItemToLibraryItem } from '../../lib/indexMappers'
import type { PageNavigationIntent } from '../../lib/pageNavigation'
import { getNonElectronHint } from '../../lib/runtime'
import type { LibraryItem } from '../../types/niuvis'

const typeColor: Record<string, 'accent' | 'danger' | 'success' | 'warning' | 'default'> = {
  DOC: 'accent',
  DOCX: 'accent',
  MD: 'default',
  PDF: 'danger',
  PPT: 'warning',
  PPTX: 'warning',
  TXT: 'default',
  XLS: 'success',
  XLSX: 'success',
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

interface DocumentsPageProps {
  navigationIntent?: PageNavigationIntent
  onNavigationIntentConsumed?: () => void
}

export default function DocumentsPage({
  navigationIntent,
  onNavigationIntentConsumed,
}: DocumentsPageProps) {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [viewSource, setViewSource] = useState<LibraryViewSource>('library')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LibraryItem[] | null>(null)
  const [indexDocTotal, setIndexDocTotal] = useState(0)

  const mapDocument = useCallback(
    (item: Parameters<typeof indexItemToLibraryItem>[0]) => indexItemToLibraryItem(item, 'documents'),
    [],
  )

  const browse = usePaginatedIndexBrowse({ kind: 'document', mapItem: mapDocument })

  const loadLibrary = async () => {
    if (!window.niuvisLibrary) throw new Error(getNonElectronHint())
    setLibraryItems(await window.niuvisLibrary.list('documents'))
  }

  const refreshIndexHint = async () => {
    if (!window.niuvisIndex?.status) return

    const status = await window.niuvisIndex.status()
    if (status.itemCount <= 0) {
      setIndexDocTotal(0)
      return
    }

    const probe = await window.niuvisIndex.list({ kind: 'document', limit: 1, offset: 0 })
    setIndexDocTotal(probe.total)
  }

  const loadInitial = async () => {
    setLoading(true)
    setError(null)

    try {
      await loadLibrary()
      await refreshIndexHint()
    } catch (err) {
      setError(formatIpcError(err) || '读取文档失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadInitial()
  }, [])

  useEffect(() => {
    if (!navigationIntent) return

    void (async () => {
      if (navigationIntent.openIndexView) {
        setViewSource('index')
        await browse.startBrowse()
      }

      if (navigationIntent.searchQuery) {
        setQuery(navigationIntent.searchQuery)
      }

      onNavigationIntentConsumed?.()
    })()
  }, [navigationIntent, onNavigationIntentConsumed, browse])

  const handleSourceChange = async (next: LibraryViewSource) => {
    setViewSource(next)
    setSearchResults(null)
    setQuery('')

    if (next === 'library') {
      browse.resetBrowse()
      return
    }

    await browse.startBrowse()
  }

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const keyword = query.trim()

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }

    if (keyword.length < 3 || viewSource !== 'index') {
      setSearchResults(null)
      setSearching(false)
      return
    }

    if (!window.niuvisIndex?.search) {
      return
    }

    searchDebounceRef.current = setTimeout(() => {
      void (async () => {
        setSearching(true)
        setError(null)

        try {
          const result = await window.niuvisIndex!.search({
            query: keyword,
            kind: 'document',
            limit: INDEX_PAGE_SIZE,
          })

          setSearchResults(result.items.map((item) => indexItemToLibraryItem(item, 'documents')))
        } catch (err) {
          setError(formatIpcError(err) || '搜索文档失败')
        } finally {
          setSearching(false)
        }
      })()
    }, 280)

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current)
    }
  }, [query, viewSource])

  const displayItems = useMemo(() => {
    if (searchResults) return searchResults

    const keyword = query.trim().toLocaleLowerCase()

    if (viewSource === 'index') {
      if (!keyword) return browse.items
      return browse.items.filter((item) =>
        [item.name, item.type].some((value) => value.toLocaleLowerCase().includes(keyword)),
      )
    }

    if (!keyword) return libraryItems

    return libraryItems.filter((item) =>
      [item.name, item.type].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [browse.items, libraryItems, query, searchResults, viewSource])

  const subtitle = searchResults
    ? `搜索到 ${searchResults.length} 个结果`
    : viewSource === 'index'
      ? `电脑索引 ${browse.items.length} / ${browse.total} 个文档（分页）`
      : `本地上传 ${libraryItems.length} 个${indexDocTotal > 0 ? ` · 索引另有 ${indexDocTotal} 个` : ''}`

  const uploadDocuments = async () => {
    if (!window.niuvisLibrary) return

    setUploading(true)
    setError(null)

    try {
      await window.niuvisLibrary.upload('documents')
      await loadLibrary()
    } catch (err) {
      setError(formatIpcError(err) || '上传文档失败')
    } finally {
      setUploading(false)
    }
  }

  const openDocument = async (item: LibraryItem) => {
    if (viewSource === 'index' || searchResults) {
      await window.niuvisComputer?.open(item.storedPath)
      return
    }

    if (!window.niuvisLibrary) return

    await window.niuvisLibrary.open(item.storedPath)
  }

  const handleIndexCompleted = async () => {
    await refreshIndexHint()

    if (viewSource === 'index') {
      await browse.reloadFirstPage()
    }
  }

  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#212121] !text-white" variant="transparent">
      <Surface className="shrink-0 border-b border-white/8 px-6 py-5" variant="transparent">
        <Surface className="flex flex-wrap items-center justify-between gap-4" variant="transparent">
          <Surface variant="transparent">
            <Typography.Heading className="text-2xl font-semibold !text-white" level={1}>
              文档
            </Typography.Heading>
            <Typography.Paragraph className="mt-1 !text-white/50" size="sm">
              {subtitle}
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex flex-wrap items-center gap-3" variant="transparent">
            <IndexStatusChip onIndexCompleted={() => void handleIndexCompleted()} />
            <LibraryIndexViewSwitch
              indexTotal={indexDocTotal}
              source={viewSource}
              onSourceChange={(next) => void handleSourceChange(next)}
            />
            <Input
              aria-label="搜索文档"
              className="w-72 border border-white/10 bg-[#2a2a2a] text-white placeholder:text-white/40"
              placeholder={viewSource === 'index' ? '搜索索引（≥3 字）...' : '搜索本地上传...'}
              value={query}
              variant="secondary"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button
              className="bg-white text-black hover:bg-white/90"
              isDisabled={uploading}
              variant="primary"
              onPress={uploadDocuments}
            >
              {uploading ? '上传中' : '上传'}
            </Button>
          </Surface>
        </Surface>

        {error && (
          <Surface className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100" variant="transparent">
            {error}
          </Surface>
        )}
      </Surface>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-6 py-6" hideScrollBar>
        {loading || (viewSource === 'index' && searching) ? (
          <Surface className="flex flex-col gap-3" variant="transparent">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-[74px] animate-pulse border border-white/8 bg-[#2a2a2a]">
                <Card.Content />
              </Card>
            ))}
          </Surface>
        ) : displayItems.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              {viewSource === 'index' ? '索引中暂无文档' : '没有文档'}
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              {viewSource === 'index'
                ? '完成索引扫描后再查看，或切回「本地上传」。'
                : '点击上传保存到本地库，或切换到「电脑索引」浏览已扫描文档。'}
            </Typography.Paragraph>
          </Surface>
        ) : (
          <>
            <Surface className="flex flex-col gap-3" variant="transparent">
              {displayItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer border border-white/8 bg-[#2a2a2a] transition hover:border-white/18 hover:bg-[#333333]"
                  onDoubleClick={() => void openDocument(item)}
                >
                  <Card.Content className="flex flex-row items-center justify-between p-4">
                    <Surface className="flex min-w-0 items-center gap-4" variant="transparent">
                      <Surface className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#3a3a3a] text-sm font-semibold text-white" variant="transparent">
                        {item.type}
                      </Surface>
                      <Surface className="min-w-0" variant="transparent">
                        <Typography className="truncate font-medium !text-white" type="body-sm">
                          {item.name}
                        </Typography>
                        <Typography className="mt-1 !text-white/45" type="body-xs">
                          {formatDate(item.addedAt)}
                        </Typography>
                      </Surface>
                    </Surface>
                    <Surface className="flex shrink-0 items-center gap-3" variant="transparent">
                      <Typography className="!text-white/45" type="body-xs">
                        {item.size}
                      </Typography>
                      <Chip color={typeColor[item.type] || 'default'} variant="soft" size="sm">
                        {item.type}
                      </Chip>
                    </Surface>
                  </Card.Content>
                </Card>
              ))}
            </Surface>
            {viewSource === 'index' && !searchResults && (
              <IndexBrowseFooter
                loadedCount={browse.items.length}
                loading={browse.loadingMore}
                total={browse.total}
                onLoadMore={() => void browse.loadMore()}
              />
            )}
          </>
        )}
      </ScrollShadow>
    </Surface>
  )
}
