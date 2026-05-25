import { Button, Surface, Typography } from '@heroui/react'

interface IndexBrowseFooterProps {
  loadedCount: number
  total: number
  loading: boolean
  onLoadMore: () => void
}

export default function IndexBrowseFooter({
  loadedCount,
  total,
  loading,
  onLoadMore,
}: IndexBrowseFooterProps) {
  const hasMore = loadedCount < total

  if (total === 0) {
    return null
  }

  return (
    <Surface className="flex flex-col items-center gap-2 py-6" variant="transparent">
      <Typography.Paragraph className="!text-white/45" size="sm">
        已显示 {loadedCount} / {total} 条（分页加载，避免卡顿）
      </Typography.Paragraph>
      {hasMore && (
        <Button
          className="border border-white/10 bg-[#2a2a2a] text-white"
          isDisabled={loading}
          variant="outline"
          onPress={onLoadMore}
        >
          {loading ? '加载中…' : '加载更多'}
        </Button>
      )}
    </Surface>
  )
}
