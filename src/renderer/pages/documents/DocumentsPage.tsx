import { useEffect, useMemo, useState } from 'react'
import { Button, Card, Chip, Input, ScrollShadow, Surface, Typography } from '@heroui/react'
import { formatIpcError } from '../../lib/ipcError'
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

export default function DocumentsPage() {
  const [items, setItems] = useState<LibraryItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)

    try {
      if (!window.niuvisLibrary) throw new Error(getNonElectronHint())

      setItems(await window.niuvisLibrary.list('documents'))
    } catch (err) {
      setError(formatIpcError(err) || '读取文档失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadDocuments()
  }, [])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLocaleLowerCase()

    if (!keyword) return items

    return items.filter((item) =>
      [item.name, item.type].some((value) => value.toLocaleLowerCase().includes(keyword)),
    )
  }, [items, query])

  const uploadDocuments = async () => {
    if (!window.niuvisLibrary) return

    setUploading(true)
    setError(null)

    try {
      await window.niuvisLibrary.upload('documents')
      await loadDocuments()
    } catch (err) {
      setError(formatIpcError(err) || '上传文档失败')
    } finally {
      setUploading(false)
    }
  }

  const openDocument = async (item: LibraryItem) => {
    if (!window.niuvisLibrary) return

    await window.niuvisLibrary.open(item.storedPath)
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
              已保存 {items.length} 个本地文档
            </Typography.Paragraph>
          </Surface>

          <Surface className="flex items-center gap-3" variant="transparent">
            <Input
              aria-label="搜索文档"
              className="w-72 border border-white/10 bg-[#2a2a2a] text-white placeholder:text-white/40"
              placeholder="搜索文档..."
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
        {loading ? (
          <Surface className="flex flex-col gap-3" variant="transparent">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="h-[74px] animate-pulse border border-white/8 bg-[#2a2a2a]">
                <Card.Content />
              </Card>
            ))}
          </Surface>
        ) : filteredItems.length === 0 ? (
          <Surface className="flex h-[50vh] flex-col items-center justify-center text-center" variant="transparent">
            <Typography.Heading className="!text-white" level={2}>
              没有文档
            </Typography.Heading>
            <Typography.Paragraph className="mt-2 max-w-md !text-white/50" size="sm">
              点击上传，把文档保存到 Niuvis 本地库。
            </Typography.Paragraph>
          </Surface>
        ) : (
          <Surface className="flex flex-col gap-3" variant="transparent">
            {filteredItems.map((item) => (
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
        )}
      </ScrollShadow>
    </Surface>
  )
}
