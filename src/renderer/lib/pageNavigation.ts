import type { ComputerIndexKind } from '../../shared/types/computerIndex'

export type PageId = 'office' | 'chat' | 'tasks' | 'skills' | 'apps' | 'documents' | 'gallery' | 'computer'

export interface PageNavigationIntent {
  page: PageId
  searchQuery?: string
  indexKind?: ComputerIndexKind
  /** 文档/图库页切换到「电脑索引」视图 */
  openIndexView?: boolean
}

export const INDEX_KIND_TO_PAGE: Record<ComputerIndexKind, PageId> = {
  app: 'apps',
  document: 'documents',
  image: 'gallery',
  file: 'computer',
}

export function pageForIndexKind(kind: ComputerIndexKind): PageId {
  return INDEX_KIND_TO_PAGE[kind]
}
