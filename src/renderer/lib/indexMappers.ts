import type { InstalledApp } from '../../shared/types/apps'
import type { ComputerIndexItem } from '../../shared/types/computerIndex'
import type { LibraryItem } from '../../shared/types/library'

function formatSize(size?: number) {
  if (size == null) return ''

  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`

  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function indexItemToInstalledApp(item: ComputerIndexItem): InstalledApp {
  let meta: Record<string, string | undefined> = {}

  if (item.metaJson) {
    try {
      meta = JSON.parse(item.metaJson) as Record<string, string | undefined>
    } catch {
      meta = {}
    }
  }

  return {
    id: meta.appId ?? item.id,
    name: item.name,
    description: item.contentSnippet,
    command: meta.command,
    icon: meta.icon,
    iconDataUrl: meta.iconDataUrl,
    path: meta.desktopPath ?? item.path,
    source: item.source,
    category: meta.category,
  }
}

export function indexItemToLibraryItem(
  item: ComputerIndexItem,
  kind: LibraryItem['kind'],
): LibraryItem {
  const ext = item.name.includes('.') ? item.name.split('.').pop()?.toUpperCase() ?? 'FILE' : 'FILE'

  return {
    id: item.id,
    kind,
    name: item.name,
    type: ext,
    size: formatSize(item.size),
    addedAt: item.modifiedAt ?? '',
    modifiedAt: item.modifiedAt ?? '',
    storedPath: item.path,
  }
}

export const INDEX_GROUP_LABELS: Record<string, string> = {
  app: '应用',
  file: '文件',
  document: '文档',
  image: '图片',
}

export const INDEX_GROUP_ORDER = ['app', 'document', 'image', 'file'] as const
