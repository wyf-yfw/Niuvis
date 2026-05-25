import { useEffect, useMemo, useState } from 'react'
import { Button, Input, ScrollShadow, Surface, Typography } from '@heroui/react'
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
import type { DirectoryListing, FileBrowserItem } from '../../types/niuvis'

function formatDate(value?: string) {
  if (!value) return ''

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function FileIcon({ item }: { item: FileBrowserItem }) {
  if (item.isDirectory) {
    if (item.path === '/' || /^[A-Z]:\\$/i.test(item.path)) {
      return <HardDrive className="size-4 text-[#8ab4f8]" strokeWidth={1.8} />
    }

    return <Folder className="size-4 text-[#8ab4f8]" strokeWidth={1.8} />
  }

  const type = item.type.toLowerCase()

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

function getPathSegments(currentPath: string) {
  if (!currentPath) return ['此电脑']

  const normalized = currentPath.replace(/\\/g, '/')
  const parts = normalized.split('/').filter(Boolean)

  if (currentPath === '/') return ['系统根目录']
  if (parts.length === 0) return ['此电脑']

  return parts
}

export default function ComputerPage() {
  const [roots, setRoots] = useState<FileBrowserItem[]>([])
  const [listing, setListing] = useState<DirectoryListing | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadRoots = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!window.niuvisComputer) throw new Error(getNonElectronHint())

      setRoots(await window.niuvisComputer.listRoots())
      setListing(null)
    } catch (err) {
      setError(formatIpcError(err) || '读取磁盘失败')
    } finally {
      setLoading(false)
    }
  }

  const openDirectory = async (directoryPath: string) => {
    setLoading(true)
    setError(null)
    setQuery('')

    try {
      if (!window.niuvisComputer) throw new Error(getNonElectronHint())

      setListing(await window.niuvisComputer.listDirectory(directoryPath))
    } catch (err) {
      setError(formatIpcError(err) || '读取目录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadRoots()
  }, [])

  const items = listing?.items ?? roots
  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()

    if (!keyword) return items

    return items.filter((item) =>
      [item.name, item.type, item.path].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [items, query])

  const openItem = async (item: FileBrowserItem) => {
    if (item.isDirectory) {
      await openDirectory(item.path)
      return
    }

    await window.niuvisComputer?.open(item.path)
  }

  const goUp = async () => {
    if (!listing) return

    if (listing.parentPath) {
      await openDirectory(listing.parentPath)
    } else {
      await loadRoots()
    }
  }

  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#212121] !text-white" variant="transparent">
      <Surface className="shrink-0 border-b border-white/8 px-6 py-4" variant="transparent">
        <Surface className="flex flex-wrap items-center justify-between gap-3" variant="transparent">
          <Surface className="min-w-0" variant="transparent">
            <Typography.Heading className="text-xl font-semibold !text-white" level={1}>
              此电脑
            </Typography.Heading>
          </Surface>

          <Surface className="flex items-center gap-3" variant="transparent">
            <Input
              aria-label="搜索文件"
              className="w-72 border border-white/10 bg-[#2a2a2a] text-white placeholder:text-white/40"
              placeholder="搜索当前列表..."
              value={query}
              variant="secondary"
              onChange={(event) => setQuery(event.target.value)}
            />
            <Button className="border border-white/10 bg-[#2a2a2a] text-white" variant="outline" onPress={loadRoots}>
              根目录
            </Button>
            {listing && (
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

        <Surface className="mt-4 flex h-9 items-center overflow-hidden rounded-md border border-white/10 bg-[#2a2a2a] px-3" variant="transparent">
          <Surface className="flex min-w-0 items-center gap-1 text-sm" variant="transparent">
            {getPathSegments(listing?.path ?? '').map((part: string, index: number, parts: string[]) => (
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
      </Surface>

      <ScrollShadow className="min-h-0 flex-1 overflow-y-auto px-6 py-5" hideScrollBar>
        {loading ? (
          <Surface className="overflow-hidden rounded-lg border border-white/8 bg-[#252525]" variant="transparent">
            {Array.from({ length: 10 }).map((_, index) => (
              <Surface key={index} className="h-10 animate-pulse border-b border-white/6 bg-white/[0.03] last:border-b-0" variant="transparent">
                <span />
              </Surface>
            ))}
          </Surface>
        ) : filteredItems.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              没有找到文件
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              换一个关键词，或返回上级目录继续浏览。
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
                {filteredItems.map((item) => (
                  <tr
                    key={item.path}
                    className="group cursor-default border-b border-white/[0.045] text-white/80 outline-none last:border-b-0 hover:bg-white/[0.06] focus:bg-white/[0.08]"
                    tabIndex={0}
                    onDoubleClick={() => void openItem(item)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void openItem(item)
                    }}
                  >
                    <td className="px-4 py-2">
                      <Surface className="flex min-w-0 items-center gap-3" variant="transparent">
                        <span className="flex w-4 shrink-0 items-center justify-center">
                          <FileIcon item={item} />
                        </span>
                        <Typography className="truncate !text-white/86" type="body-sm">
                          {item.name}
                        </Typography>
                      </Surface>
                    </td>
                    <td className="truncate px-4 py-2 text-white/48">{formatDate(item.modifiedAt)}</td>
                    <td className="truncate px-4 py-2 text-white/48">{item.type}</td>
                    <td className="px-4 py-2 text-right text-white/48">{item.isDirectory ? '' : item.size}</td>
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
