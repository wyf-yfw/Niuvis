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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

interface GalleryPageProps {
  navigationIntent?: PageNavigationIntent
  onNavigationIntentConsumed?: () => void
}

export default function GalleryPage({ navigationIntent, onNavigationIntentConsumed }: GalleryPageProps) {
  const [libraryItems, setLibraryItems] = useState<LibraryItem[]>([])
  const [viewSource, setViewSource] = useState<LibraryViewSource>('library')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchResults, setSearchResults] = useState<LibraryItem[] | null>(null)
  const [indexImageTotal, setIndexImageTotal] = useState(0)

  const mapImage = useCallback(
    (item: Parameters<typeof indexItemToLibraryItem>[0]) => indexItemToLibraryItem(item, 'gallery'),
    [],
  )

  const browse = usePaginatedIndexBrowse({ kind: 'image', mapItem: mapImage })

  const loadLibrary = async () => {
    if (!window.niuvisLibrary) throw new Error(getNonElectronHint())
    setLibraryItems(await window.niuvisLibrary.list('gallery'))
  }

  const refreshIndexHint = async () => {
    if (!window.niuvisIndex?.status) return

    const status = await window.niuvisIndex.status()
    if (status.itemCount <= 0) {
      setIndexImageTotal(0)
      return
    }

    const probe = await window.niuvisIndex.list({ kind: 'image', limit: 1, offset: 0 })
    setIndexImageTotal(probe.total)
  }

  const loadInitial = async () => {
    setLoading(true)
    setError(null)

    try {
      await loadLibrary()
      await refreshIndexHint()
    } catch (err) {
      setError(formatIpcError(err) || '读取图库失败')
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
            kind: 'image',
            limit: INDEX_PAGE_SIZE,
          })

          setSearchResults(result.items.map((item) => indexItemToLibraryItem(item, 'gallery')))
        } catch (err) {
          setError(formatIpcError(err) || '搜索图片失败')
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
      ? `电脑索引 ${browse.items.length} / ${browse.total} 张（分页）`
      : `本地上传 ${libraryItems.length} 张${indexImageTotal > 0 ? ` · 索引另有 ${indexImageTotal} 张` : ''}`

  const uploadImages = async () => {
    if (!window.niuvisLibrary) return

    setUploading(true)
    setError(null)

    try {
      await window.niuvisLibrary.upload('gallery')
      await loadLibrary()
    } catch (err) {
      setError(formatIpcError(err) || '上传图片失败')
    } finally {
      setUploading(false)
    }
  }

  const openImage = async (item: LibraryItem) => {
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
              图库
            </Typography.Heading>
            <Typography.Paragraph className="mt-1 !text-white/50" size="sm">
              {subtitle}
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex flex-wrap items-center gap-3" variant="transparent">
            <IndexStatusChip onIndexCompleted={() => void handleIndexCompleted()} />
            <LibraryIndexViewSwitch
              indexTotal={indexImageTotal}
              source={viewSource}
              onSourceChange={(next) => void handleSourceChange(next)}
            />
            <Input
              aria-label="搜索图片"
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
              onPress={uploadImages}
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
          <Surface className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" variant="transparent">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="h-[220px] animate-pulse border border-white/8 bg-[#2a2a2a]">
                <Card.Content />
              </Card>
            ))}
          </Surface>
        ) : displayItems.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              {viewSource === 'index' ? '索引中暂无图片' : '没有图片'}
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              {viewSource === 'index'
                ? '完成索引扫描后再查看，或切回「本地上传」。'
                : '点击上传保存到本地库，或切换到「电脑索引」浏览已扫描图片。'}
            </Typography.Paragraph>
          </Surface>
        ) : (
          <>
            <Surface className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" variant="transparent">
              {displayItems.map((item) => (
                <Card
                  key={item.id}
                  className="cursor-pointer overflow-hidden border border-white/8 bg-[#2a2a2a] transition hover:border-white/18 hover:bg-[#333333]"
                  onDoubleClick={() => void openImage(item)}
                >
                  <Card.Content className="p-0">
                    <Surface className="flex aspect-[4/3] w-full items-center justify-center bg-[#343434]" variant="transparent">
                      {item.previewDataUrl ? (
                        <img
                          alt=""
                          className="h-full w-full object-cover"
                          draggable={false}
                          src={item.previewDataUrl}
                        />
                      ) : (
                        <Typography className="!text-white/55" type="body-sm">
                          {item.type}
                        </Typography>
                      )}
                    </Surface>
                    <Surface className="p-4" variant="transparent">
                      <Typography className="truncate text-sm font-medium !text-white" type="body-sm">
                        {item.name}
                      </Typography>
                      <Surface className="mt-3 flex items-center justify-between gap-3" variant="transparent">
                        <Typography className="!text-white/45" type="body-xs">
                          {formatDate(item.addedAt)}
                        </Typography>
                        <Surface className="flex items-center gap-2" variant="transparent">
                          <Typography className="!text-white/45" type="body-xs">
                            {item.size}
                          </Typography>
                          <Chip className="bg-white/[0.07] !text-white/60" size="sm" variant="soft">
                            {item.type}
                          </Chip>
                        </Surface>
                      </Surface>
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
