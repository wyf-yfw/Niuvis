import type { InstalledApp, InstalledAppsResult } from '../../shared/types/apps'
import type { ChatMessage, ChatModelSettings } from '../../shared/types/chat'
import type { DirectoryListing, FileBrowserItem } from '../../shared/types/computer'
import type { IpcErrorCode } from '../../shared/types/ipc'
import type { LibraryItem, LibraryKind } from '../../shared/types/library'
import type {
  ComputerIndexItem,
  IndexListParams,
  IndexListResult,
  IndexSearchParams,
  IndexSearchResult,
  IndexStartResult,
  IndexStatus,
} from '../../shared/types/computerIndex'
import type {
  AppSettings,
  ModelConnectionTestResult,
  ModelProfile,
} from '../../shared/types/settings'

export type {
  InstalledApp,
  InstalledAppsResult,
  ChatMessage,
  ChatModelSettings,
  DirectoryListing,
  FileBrowserItem,
  LibraryItem,
  LibraryKind,
  IpcErrorCode,
  AppSettings,
  ModelProfile,
  ModelConnectionTestResult,
  ComputerIndexItem,
  IndexSearchParams,
  IndexSearchResult,
  IndexListParams,
  IndexListResult,
  IndexDirectoryEntry,
  IndexDirectoryListing,
  IndexStatus,
  IndexStartResult,
}

declare global {
  interface Window {
    __NIUVIS_ELECTRON__?: boolean
    niuvisApps?: {
      listInstalled: (options?: { forceRefresh?: boolean }) => Promise<InstalledAppsResult>
      open: (appToOpen: InstalledApp) => Promise<boolean>
    }
    niuvisLibrary?: {
      list: (kind: LibraryKind) => Promise<LibraryItem[]>
      upload: (kind: LibraryKind) => Promise<LibraryItem[]>
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
      get: () => Promise<AppSettings>
      save: (settings: AppSettings) => Promise<AppSettings>
      getChat: () => Promise<ChatModelSettings>
      saveChat: (chat: ChatModelSettings) => Promise<ChatModelSettings>
      testConnection: (profile: ModelProfile) => Promise<ModelConnectionTestResult>
      pickDirectory: () => Promise<string | null>
    }
    niuvisIndex?: {
      start: () => Promise<IndexStartResult>
      status: () => Promise<IndexStatus>
      stop: () => Promise<IndexStatus>
      search: (params: IndexSearchParams) => Promise<IndexSearchResult>
      list: (params?: IndexListParams) => Promise<IndexListResult>
      listDirectory: (directoryPath?: string | null) => Promise<IndexDirectoryListing>
    }
  }
}

export {}
