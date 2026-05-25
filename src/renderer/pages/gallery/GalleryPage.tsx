import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Chip, Input, ScrollShadow, Surface, Typography } from '@heroui/react'
import type { LibraryItem } from '../../types/niuvis'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

export default function GalleryPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadGallery = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!window.niuvisLibrary) throw new Error('图库接口只在 Electron 窗口中可用')

      setItems(await window.niuvisLibrary.list('gallery'))
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取图库失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadGallery()
  }, [])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()

    if (!keyword) return items

    return items.filter((item) =>
      [item.name, item.type].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [items, query])

  const uploadImages = async () => {
    if (!window.niuvisLibrary) return

    setUploading(true)
    setError(null)

    try {
      await window.niuvisLibrary.upload('gallery')
      await loadGallery()
    } catch (err) {
      setError(err instanceof Error ? err.message : '上传图片失败')
    } finally {
      setUploading(false)
    }
  }

  const openImage = async (item: LibraryItem) => {
    if (!window.niuvisLibrary) return

    await window.niuvisLibrary.open(item.storedPath)
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
              已保存 {items.length} 张图片
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex items-center gap-3" variant="transparent">
            <Input
              aria-label="搜索图片"
              className="w-72 border border-white/10 bg-[#2a2a2a] text-white placeholder:text-white/40"
              placeholder="搜索图片..."
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
        {loading ? (
          <Surface className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" variant="transparent">
            {Array.from({ length: 8 }).map((_, index) => (
              <Card key={index} className="h-[220px] animate-pulse border border-white/8 bg-[#2a2a2a]">
                <Card.Content />
              </Card>
            ))}
          </Surface>
        ) : filteredItems.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              没有图片
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              点击上传，把图片保存到 Niuvis 本地图库。
            </Typography.Paragraph>
          </Surface>
        ) : (
          <Surface className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4" variant="transparent">
            {filteredItems.map((item) => (
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
        )}
      </ScrollShadow>
    </Surface>
  )
}
