import { Button, Surface } from '@heroui/react'
import type { ComputerIndexKind } from '../../../shared/types/computerIndex'

export type IndexSearchKindFilter = 'all' | ComputerIndexKind

export const INDEX_SEARCH_KIND_OPTIONS: Array<{
  id: IndexSearchKindFilter
  label: string
}> = [
  { id: 'all', label: '全部' },
  { id: 'app', label: '应用' },
  { id: 'document', label: '文档' },
  { id: 'image', label: '图片' },
  { id: 'file', label: '文件' },
]

interface IndexSearchKindTabsProps {
  active: IndexSearchKindFilter
  counts: Partial<Record<IndexSearchKindFilter, number>>
  onChange: (kind: IndexSearchKindFilter) => void
}

export default function IndexSearchKindTabs({ active, counts, onChange }: IndexSearchKindTabsProps) {
  return (
    <Surface className="flex flex-wrap gap-2" variant="transparent">
      {INDEX_SEARCH_KIND_OPTIONS.map((option) => {
        const count = counts[option.id] ?? 0
        const isActive = active === option.id
        const disabled = count === 0

        return (
          <Button
            key={option.id}
            className={
              isActive
                ? 'bg-white text-black hover:bg-white/90'
                : 'border border-white/10 bg-[#2a2a2a] text-white/80 hover:bg-[#333333]'
            }
            isDisabled={disabled}
            size="sm"
            variant={isActive ? 'primary' : 'outline'}
            onPress={() => onChange(option.id)}
          >
            {option.label}
            {count > 0 && <span className="ml-1.5 text-xs opacity-70">{count}</span>}
          </Button>
        )
      })}
    </Surface>
  )
}
