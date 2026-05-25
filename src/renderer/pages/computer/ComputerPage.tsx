import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button, ScrollShadow, SearchField, Surface, Typography } from '@heroui/react'
import IndexStatusChip from '../../components/index/IndexStatusChip'
import IndexSearchKindTabs, { type IndexSearchKindFilter } from '../../components/index/IndexSearchKindTabs'
import { INDEX_GROUP_LABELS, indexItemToInstalledApp } from '../../lib/indexMappers'
import type { ComputerIndexKind } from '../../shared/types/computerIndex'
import {
  File,
  FileArchive,
  FileImage,
  FileText,
  Folder,
  HardDrive,
  Music,
  Video,
} from 'lucide-react'
import { formatIpcError } from '../../lib/ipcError'
import { getNonElectronHint } from '../../lib/runtime'
import type { PageNavigationIntent } from '../../lib/pageNavigation'
import { pageForIndexKind } from '../../lib/pageNavigation'
import type { ComputerIndexItem, IndexDirectoryEntry } from '../../shared/types/computerIndex'
import type { InstalledApp } from '../../types/niuvis'

interface ComputerPageProps {
  onNavigate?: (intent: PageNavigationIntent) => void
}

function formatDate(value?: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function formatSize(size?: number) {
  if (size == null) return ''

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getExtension(name: string) {
  const index = name.lastIndexOf('.')

  return index >= 0 ? name.slice(index + 1).toLowerCase() : ''
}

function EntryIcon({ entry }: { entry: IndexDirectoryEntry }) {
  if (entry.isDirectory) {
    return <Folder className="size-4 text-[#8ab4f8]" strokeWidth={1.8} />
  }

  const type = getExtension(entry.name)

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif'].includes(type)) {
    return <FileImage className="size-4 text-emerald-300" strokeWidth={1.8} />
  }

  if (['mp4', 'mkv', 'mov', 'webm', 'avi'].includes(type)) {
    return <Video className="size-4 text-violet-300" strokeWidth={1.8} />
  }

  if (['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(type)) {
    return <Music className="size-4 text-pink-300" strokeWidth={1.8} />
  }

  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(type)) {
    return <FileArchive className="size-4 text-amber-300" strokeWidth={1.8} />
  }

  if (['pdf', 'doc', 'docx', 'txt', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(type)) {
    return <FileText className="size-4 text-white/65" strokeWidth={1.8} />
  }

  return <File className="size-4 text-white/50" strokeWidth={1.8} />
}

function getPathSegments(currentPath: string | null) {
  if (!currentPath) return ['索引根目录']

  const normalized = currentPath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)

  if (currentPath === '/') return ['系统根目录']

  return parts
}

function IndexHighlight({ text }: { text?: string }) {
  if (!text) return null

  return (
    <span
      className="text-xs text-white/55 [&_mark]:rounded [&_mark]:bg-amber-400/25 [&_mark]:text-amber-100"
      dangerouslySetInnerHTML={{ __html: text }}
    />
  )
}

export default function ComputerPage({ onNavigate }: ComputerPageProps) {
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [entries, setEntries] = useState<IndexDirectoryEntry[]>([])
  const [parentPath, setParentPath] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [indexEmpty, setIndexEmpty] = useState(false)
  const [indexResults, setIndexResults] = useState<ComputerIndexItem[]>([])
  const [indexSearching, setIndexSearching] = useState(false)
  const [indexTotal, setIndexTotal] = useState(0)
  const [searchKind, setSearchKind] = useState<IndexSearchKindFilter>('all')
  const [kindCounts, setKindCounts] = useState<Partial<Record<IndexSearchKindFilter, number>>>({})

  const useIndexSearch = query.trim().length >= 3
  const SEARCH_RESULT_LIMIT = 80

  const loadDirectory = useCallback(async (directoryPath: string | null) => {
    setLoading(true)
    setError(null)
    setQuery('')

    try {
      if (!window.niuvisIndex?.listDirectory) {
        throw new Error(getNonElectronHint())
      }

      const status = await window.niuvisIndex.status()

      if (status.itemCount <= 0) {
        setIndexEmpty(true)
        setEntries([])
        setCurrentPath(null)
        setParentPath(null)
        return
      }

      setIndexEmpty(false)

      const listing = await window.niuvisIndex.listDirectory(directoryPath)

      setCurrentPath(listing.path)
      setParentPath(listing.parentPath)
      setEntries(listing.entries)
    } catch (err) {
      setError(formatIpcError(err) || '读取索引目录失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadDirectory(null)
  }, [loadDirectory])

  useEffect(() => {
    if (!useIndexSearch || !window.niuvisIndex?.search) {
      setIndexResults([])
      setIndexTotal(0)
      setKindCounts({})
      return
    }

    const keyword = query.trim()
    let cancelled = false

    const timer = setTimeout(() => {
      void (async () => {
        setIndexSearching(true)
        setError(null)
        setSearchKind('all')

        try {
          const search = window.niuvisIndex!.search
          const [all, app, document, image, file] = await Promise.all([
            search({ query: keyword, limit: 1 }),
            search({ query: keyword, kind: 'app', limit: 1 }),
            search({ query: keyword, kind: 'document', limit: 1 }),
            search({ query: keyword, kind: 'image', limit: 1 }),
            search({ query: keyword, kind: 'file', limit: 1 }),
          ])

          if (cancelled) return

          const counts: Partial<Record<IndexSearchKindFilter, number>> = {
            all: all.total,
            app: app.total,
            document: document.total,
            image: image.total,
            file: file.total,
          }

          setKindCounts(counts)

          const list = await search({ query: keyword, limit: SEARCH_RESULT_LIMIT })

          if (cancelled) return

          setIndexResults(list.items)
          setIndexTotal(list.total)
        } catch (err) {
          if (!cancelled) {
            setError(formatIpcError(err) || '搜索失败')
          }
        } finally {
          if (!cancelled) {
            setIndexSearching(false)
          }
        }
      })()
    }, 280)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, useIndexSearch])

  const searchRequestIdRef = useRef(0)

  const loadSearchForKind = useCallback(
    async (kind: IndexSearchKindFilter) => {
      if (!window.niuvisIndex?.search || !useIndexSearch) return

      const keyword = query.trim()
      const requestId = searchRequestIdRef.current + 1
      searchRequestIdRef.current = requestId
      setIndexSearching(true)
      setError(null)

      try {
        const result = await window.niuvisIndex.search({
          query: keyword,
          kind: kind === 'all' ? undefined : (kind as ComputerIndexKind),
          limit: SEARCH_RESULT_LIMIT,
        })

        if (searchRequestIdRef.current !== requestId) return

        setIndexResults(result.items)
        setIndexTotal(result.total)
      } catch (err) {
        if (searchRequestIdRef.current === requestId) {
          setError(formatIpcError(err) || '搜索失败')
        }
      } finally {
        if (searchRequestIdRef.current === requestId) {
          setIndexSearching(false)
        }
      }
    },
    [query, useIndexSearch],
  )

  const handleSearchKindChange = (kind: IndexSearchKindFilter) => {
    setSearchKind(kind)
    void loadSearchForKind(kind)
  }

  const activeSearchKindLabel = INDEX_GROUP_LABELS[searchKind] ?? '全部'

  const filteredEntries = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()

    if (!keyword || useIndexSearch) return entries

    return entries.filter((entry) =>
      [entry.name, entry.path].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [entries, query, useIndexSearch])

  const openEntry = async (entry: IndexDirectoryEntry) => {
    if (entry.isDirectory) {
      await loadDirectory(entry.path)
      return
    }

    if (entry.kind === 'app') {
      const app: InstalledApp = indexItemToInstalledApp({
        id: entry.path,
        kind: 'app',
        name: entry.name,
        path: entry.path,
        modifiedAt: entry.modifiedAt,
      })

      await window.niuvisApps?.open(app)
      return
    }

    await window.niuvisComputer?.open(entry.path)
  }

  const openIndexItem = async (item: ComputerIndexItem) => {
    if (item.kind === 'app') {
      const app: InstalledApp = indexItemToInstalledApp(item)
      await window.niuvisApps?.open(app)
      return
    }

    await window.niuvisComputer?.open(item.path)
  }

  const goUp = async () => {
    if (parentPath == null) {
      await loadDirectory(null)
      return
    }

    await loadDirectory(parentPath)
  }

  const goToRoots = async () => {
    await loadDirectory(null)
  }

  const navigateToSearchPage = () => {
    const keyword = query.trim()

    if (keyword.length < 3 || !onNavigate || indexTotal === 0) {
      return
    }

    const targetKind = searchKind === 'all' ? 'file' : searchKind

    onNavigate({
      page: pageForIndexKind(targetKind),
      searchQuery: keyword,
      indexKind: targetKind,
      openIndexView: targetKind === 'document' || targetKind === 'image',
    })
  }

  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#212121] !text-white" variant="transparent">
      <Surface className="shrink-0 border-b border-white/8 px-6 py-4" variant="transparent">
        <Surface className="flex flex-wrap items-center justify-between gap-3" variant="transparent">
          <Surface className="min-w-0" variant="transparent">
            <Typography.Heading className="text-xl font-semibold !text-white" level={1}>
              此电脑
            </Typography.Heading>
            <Typography.Paragraph className="mt-1 !text-white/45" size="sm">
              仅显示本地索引中的内容，未索引的文件不会出现在这里
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex items-center gap-3" variant="transparent">
            <IndexStatusChip onIndexCompleted={() => void loadDirectory(currentPath)} />
            <SearchField
              aria-label="搜索索引"
              className="w-80"
              value={query}
              variant="secondary"
              onChange={setQuery}
              onSubmit={navigateToSearchPage}
            >
              <SearchField.Group className="h-10 border border-white/10 bg-[#2a2a2a] px-3">
                <SearchField.SearchIcon className="size-4 !text-white/50" />
                <SearchField.Input
                  className="text-white placeholder:text-white/40"
                  placeholder="搜索索引（至少 3 个字，先选类型）..."
                />
                <SearchField.ClearButton className="!text-white/55" />
              </SearchField.Group>
            </SearchField>
            <Button className="border border-white/10 bg-[#2a2a2a] text-white" variant="outline" onPress={goToRoots}>
              索引根目录
            </Button>
            {currentPath && (
              <Button className="bg-white text-black hover:bg-white/90" variant="primary" onPress={goUp}>
                返回上级
              </Button>
            )}
          </Surface>
        </Surface>

        {error && (
          <Surface className="mt-4 rounded-lg border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100" variant="transparent">
            {error}
          </Surface>
        )}

        {!useIndexSearch && (
          <Surface className="mt-4 flex h-9 items-center overflow-hidden rounded-md border border-white/10 bg-[#2a2a2a] px-3" variant="transparent">
            <Surface className="flex min-w-0 items-center gap-1 text-sm" variant="transparent">
              {getPathSegments(currentPath).map((part: string, index: number, parts: string[]) => (
                <Surface key={`${part}-${index}`} className="flex min-w-0 items-center gap-1" variant="transparent">
                  <Typography className="truncate !text-white/75" type="body-sm">
                    {part}
                  </Typography>
                  {index < parts.length - 1 && (
                    <Typography className="!text-white/35" type="body-sm">
                      /
                    </Typography>
                  )}
                </Surface>
              ))}
            </Surface>
          </Surface>
        )}
      </Surface>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-6 py-5" hideScrollBar>
        {useIndexSearch ? (
          indexSearching ? (
            <Surface className="py-16 text-center text-white/50" variant="transparent">
              正在搜索本地索引…
            </Surface>
          ) : (kindCounts.all ?? 0) === 0 ? (
            <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
              <Typography.Heading className="!text-white" level={2}>
                未找到匹配项
              </Typography.Heading>
              <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
                换一个关键词试试，支持文件名、路径与文档内容。
              </Typography.Paragraph>
            </Surface>
          ) : (
            <Surface className="space-y-4" variant="transparent">
              <IndexSearchKindTabs active={searchKind} counts={kindCounts} onChange={handleSearchKindChange} />

              <Typography.Paragraph className="!text-white/45" size="sm">
                {searchKind === 'all'
                  ? `全部共 ${kindCounts.all ?? indexTotal} 条，当前显示前 ${indexResults.length} 条`
                  : `${activeSearchKindLabel} ${indexTotal} 条，显示前 ${indexResults.length} 条`}
                {onNavigate && indexResults.length > 0 && (
                  <> · 回车打开「{activeSearchKindLabel === '全部' ? '文件' : activeSearchKindLabel}」页查看更多</>
                )}
              </Typography.Paragraph>

              {indexResults.length === 0 ? (
                <Surface className="py-12 text-center text-white/50" variant="transparent">
                  该类型下没有匹配项，请切换其他类型
                </Surface>
              ) : (
                <Surface className="overflow-hidden rounded-lg border border-white/8 bg-[#242424]" variant="transparent">
                  {indexResults.map((item) => (
                    <Surface
                      key={item.id}
                      className="flex cursor-default items-start justify-between gap-4 border-b border-white/[0.045] px-4 py-3 last:border-b-0 hover:bg-white/[0.06]"
                      role="button"
                      tabIndex={0}
                      variant="transparent"
                      onDoubleClick={() => void openIndexItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') void openIndexItem(item)
                      }}
                    >
                      <Surface className="min-w-0 flex-1" variant="transparent">
                        <Surface className="mb-1 flex items-center gap-2" variant="transparent">
                          <Typography className="truncate font-medium !text-white/90" type="body-sm">
                            {item.name}
                          </Typography>
                          <Typography className="shrink-0 text-xs !text-white/40" type="body-xs">
                            {INDEX_GROUP_LABELS[item.kind] ?? item.kind}
                          </Typography>
                        </Surface>
                        <Typography className="truncate font-mono text-xs !text-white/45" type="body-xs">
                          {item.path}
                        </Typography>
                        <IndexHighlight text={item.highlight ?? item.contentSnippet} />
                      </Surface>
                      <Typography className="shrink-0 text-xs !text-white/40" type="body-xs">
                        {formatDate(item.modifiedAt)}
                      </Typography>
                    </Surface>
                  ))}
                </Surface>
              )}
            </Surface>
          )
        ) : loading ? (
          <Surface className="overflow-hidden rounded-lg border border-white/8 bg-[#252525]" variant="transparent">
            {Array.from({ length: 10 }).map((_, index) => (
              <Surface key={index} className="h-10 animate-pulse border-b border-white/6 bg-white/[0.03] last:border-b-0" variant="transparent">
                <span />
              </Surface>
            ))}
          </Surface>
        ) : indexEmpty ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <HardDrive className="mx-auto mb-4 size-10 text-white/30" strokeWidth={1.5} />
            <Typography.Heading className="!text-white" level={2}>
              尚未建立索引
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              点击右上角索引状态开始扫描。完成后，此电脑中只会显示已纳入索引的文件与应用。
            </Typography.Paragraph>
          </Surface>
        ) : filteredEntries.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              此目录下没有已索引项
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              该文件夹内没有单独索引的文件，或子文件夹为空。可返回上级或重新扫描索引。
            </Typography.Paragraph>
          </Surface>
        ) : (
          <Surface className="overflow-hidden rounded-lg border border-white/8 bg-[#242424]" variant="transparent">
            <table className="w-full table-fixed border-collapse text-sm">
              <thead className="sticky top-0 z-10 bg-[#2c2c2c] text-left text-xs font-medium text-white/50">
                <tr className="border-b border-white/8">
                  <th className="w-[46%] px-4 py-2 font-medium">名称</th>
                  <th className="w-[22%] px-4 py-2 font-medium">修改日期</th>
                  <th className="w-[18%] px-4 py-2 font-medium">类型</th>
                  <th className="w-[14%] px-4 py-2 text-right font-medium">大小</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map((entry) => (
                  <tr
                    key={entry.path}
                    className="group cursor-default border-b border-white/[0.045] text-white/80 outline-none last:border-b-0 hover:bg-white/[0.06] focus:bg-white/[0.08]"
                    tabIndex={0}
                    onDoubleClick={() => void openEntry(entry)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void openEntry(entry)
                    }}
                  >
                    <td className="px-4 py-2">
                      <Surface className="flex min-w-0 items-center gap-3" variant="transparent">
                        <span className="flex w-4 shrink-0 items-center justify-center">
                          <EntryIcon entry={entry} />
                        </span>
                        <Typography className="truncate !text-white/86" type="body-sm">
                          {entry.name}
                        </Typography>
                      </Surface>
                    </td>
                    <td className="truncate px-4 py-2 text-white/48">{formatDate(entry.modifiedAt)}</td>
                    <td className="truncate px-4 py-2 text-white/48">
                      {entry.isDirectory
                        ? '文件夹'
                        : (entry.kind ?? getExtension(entry.name).toUpperCase()) || '文件'}
                    </td>
                    <td className="px-4 py-2 text-right text-white/48">
                      {entry.isDirectory ? '' : formatSize(entry.size)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Surface>
        )}
      </ScrollShadow>
    </Surface>
  )
}
