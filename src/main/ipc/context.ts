import { app } from 'electron'
import path from 'node:path'

export function getInstalledAppsCachePath() {
  return path.join(app.getPath('userData'), 'installed-apps-cache.json')
}

export function getLibraryRoot() {
  return path.join(app.getPath('userData'), 'library')
}

export function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json')
}
