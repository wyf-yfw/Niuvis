import { Button, Surface } from '@heroui/react'

export type LibraryViewSource = 'library' | 'index'

interface LibraryIndexViewSwitchProps {
  source: LibraryViewSource
  indexTotal: number
  onSourceChange: (source: LibraryViewSource) => void
}

export default function LibraryIndexViewSwitch({
  source,
  indexTotal,
  onSourceChange,
}: LibraryIndexViewSwitchProps) {
  if (indexTotal <= 0) {
    return null
  }

  return (
    <Surface className="flex rounded-lg border border-white/10 p-0.5" variant="transparent">
      <Button
        className={
          source === 'library'
            ? 'bg-white text-black hover:bg-white/90'
            : 'bg-transparent text-white/70 hover:bg-white/10'
        }
        size="sm"
        variant={source === 'library' ? 'primary' : 'ghost'}
        onPress={() => onSourceChange('library')}
      >
        本地上传
      </Button>
      <Button
        className={
          source === 'index'
            ? 'bg-white text-black hover:bg-white/90'
            : 'bg-transparent text-white/70 hover:bg-white/10'
        }
        size="sm"
        variant={source === 'index' ? 'primary' : 'ghost'}
        onPress={() => onSourceChange('index')}
      >
        电脑索引
      </Button>
    </Surface>
  )
}
