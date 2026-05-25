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

export interface InstalledAppsResult {
  apps: InstalledApp[]
  source: 'cache' | 'scan'
}
