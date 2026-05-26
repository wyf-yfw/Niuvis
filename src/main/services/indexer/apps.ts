import { loadInstalledApps } from '../../installedApps.js'
import { getInstalledAppsCachePath } from '../../ipc/context.js'
import { upsertComputerIndexItem } from '../database/indexItems.js'

export async function indexInstalledApps() {
  const { apps } = await loadInstalledApps({
    cachePath: getInstalledAppsCachePath(),
    forceRefresh: true,
  } as { cachePath: string; forceRefresh: boolean })

  let count = 0

  for (const app of apps) {
    const itemPath = app.path || `app://${app.id}`

    upsertComputerIndexItem({
      kind: 'app',
      name: app.name,
      path: itemPath,
      source: app.source ?? 'installed',
      contentSnippet: [app.description, app.command, app.category].filter(Boolean).join(' '),
      permissionsJson: JSON.stringify({
        command: app.command,
        category: app.category,
        icon: app.icon,
        iconDataUrl: app.iconDataUrl,
        iconPath: app.iconPath ?? app.icon,
        desktopPath: app.path,
        appId: app.id,
      }),
    })

    count += 1
  }

  return count
}
