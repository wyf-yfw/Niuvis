export interface FileBrowserItem {
  id: string
  name: string
  path: string
  isDirectory: boolean
  type: string
  size?: string
  bytes?: number
  modifiedAt?: string
}

export interface DirectoryListing {
  path: string
  parentPath: string
  items: FileBrowserItem[]
}
