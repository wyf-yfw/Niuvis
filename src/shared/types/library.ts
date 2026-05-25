export type LibraryKind = 'documents' | 'gallery'

export interface LibraryItem {
  id: string
  kind: LibraryKind
  name: string
  type: string
  size: string
  addedAt: string
  modifiedAt: string
  storedPath: string
  previewDataUrl?: string
}
