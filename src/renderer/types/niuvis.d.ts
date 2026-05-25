export interface LibraryItem {
  id: string
  kind: 'documents' | 'gallery'
  name: string
  type: string
  size: string
  addedAt: string
  modifiedAt: string
  storedPath: string
  previewDataUrl?: string
}

export interface InstalledApp {
  id: string
  name: string
  description?: string
  command?: string
  icon?: string
  iconDataUrl?: string
  iconPath?: string
  path?: string
  source?: string
  category?: string
}

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

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface ChatModelSettings {
  apiKey: string
  baseUrl: string
  model: string
}

declare global {
  interface Window {
    niuvisApps?: {
      listInstalled: (options?: { forceRefresh?: boolean }) => Promise<{
        apps: InstalledApp[]
        source: 'cache' | 'scan'
      }>
      open: (appToOpen: InstalledApp) => Promise<boolean>
    }
    niuvisLibrary?: {
      list: (kind: 'documents' | 'gallery') => Promise<LibraryItem[]>
      upload: (kind: 'documents' | 'gallery') => Promise<LibraryItem[]>
      open: (storedPath: string) => Promise<string>
    }
    niuvisComputer?: {
      listRoots: () => Promise<FileBrowserItem[]>
      listDirectory: (directoryPath: string) => Promise<DirectoryListing>
      open: (itemPath: string) => Promise<string>
    }
    niuvisChat?: {
      send: (messages: ChatMessage[]) => Promise<string>
    }
    niuvisSettings?: {
      getChat: () => Promise<ChatModelSettings>
      saveChat: (chat: ChatModelSettings) => Promise<ChatModelSettings>
    }
  }
}

export {}
