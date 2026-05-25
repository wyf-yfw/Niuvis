import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const DESKTOP_PLACEHOLDERS = /(?:^|\s)(?:%[fFuUdDnNickvm])\b/g
const DESKTOP_PLACEHOLDER_OPTIONS = /\s--(?:name|icon)(?:=|\s+)%[fFuUdDnNickvm]\b/g
const LINUX_ICON_EXTENSIONS = ['.svg', '.png', '.xpm']
const LINUX_ICON_SEARCH_ROOTS = [
  path.join(os.homedir(), '.local/share/icons'),
  path.join(os.homedir(), '.icons'),
  '/usr/share/icons',
  '/usr/local/share/icons',
  '/usr/share/pixmaps',
]
const CACHE_VERSION = 1

export function normalizeExecCommand(command = '') {
  return command
    .replace(DESKTOP_PLACEHOLDER_OPTIONS, '')
    .replace(DESKTOP_PLACEHOLDERS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function parseDesktopKeyValues(content) {
  const values = new Map()
  let inDesktopEntry = false

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()

    if (!line || line.startsWith('#')) continue

    if (line.startsWith('[') && line.endsWith(']')) {
      inDesktopEntry = line === '[Desktop Entry]'
      continue
    }

    if (!inDesktopEntry) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex)
    const value = line.slice(separatorIndex + 1)

    if (!key.includes('[')) {
      values.set(key, value)
    }
  }

  return values
}

function pickCategory(categories = '') {
  const categoryList = categories.split(';').filter(Boolean)
  const preferred = ['Development', 'Office', 'Graphics', 'Network', 'AudioVideo', 'Utility', 'System']

  return preferred.find((category) => categoryList.includes(category)) ?? categoryList[0] ?? 'Application'
}

export function parseDesktopEntry(content, filePath) {
  const values = parseDesktopKeyValues(content)

  if (values.get('Type') !== 'Application') return null
  if (values.get('NoDisplay') === 'true' || values.get('Hidden') === 'true') return null

  const name = values.get('Name')
  const command = normalizeExecCommand(values.get('Exec'))

  if (!name || !command) return null

  return {
    id: path.basename(filePath, '.desktop'),
    name,
    description: values.get('Comment') ?? '',
    command,
    icon: values.get('Icon') ?? '',
    path: filePath,
    source: 'desktop',
    category: pickCategory(values.get('Categories')),
  }
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

async function readDirectoryFiles(directory, extension) {
  try {
    const entries = await fs.readdir(directory, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(extension))
      .map((entry) => path.join(directory, entry.name))
  } catch {
    return []
  }
}

async function findIconInDirectory(directory, iconName) {
  let entries = []

  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch {
    return null
  }

  for (const extension of LINUX_ICON_EXTENSIONS) {
    const directPath = path.join(directory, `${iconName}${extension}`)
    if (await fileExists(directPath)) return directPath
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const foundPath = await findIconInDirectory(path.join(directory, entry.name), iconName)
    if (foundPath) return foundPath
  }

  return null
}

export async function resolveLinuxIconPath(iconName, searchRoots = LINUX_ICON_SEARCH_ROOTS) {
  if (!iconName) return ''

  if (path.isAbsolute(iconName)) {
    if (await fileExists(iconName)) return iconName

    for (const extension of LINUX_ICON_EXTENSIONS) {
      const withExtension = `${iconName}${extension}`
      if (await fileExists(withExtension)) return withExtension
    }

    return ''
  }

  const parsed = path.parse(iconName)
  const nameWithoutExtension = parsed.ext ? parsed.name : iconName
  const candidateNames = parsed.ext ? [iconName, nameWithoutExtension] : [iconName]

  for (const root of searchRoots) {
    for (const candidateName of candidateNames) {
      const foundPath = await findIconInDirectory(root, candidateName)
      if (foundPath) return foundPath
    }
  }

  return ''
}

function getIconMimeType(iconPath) {
  const extension = path.extname(iconPath).toLowerCase()

  if (extension === '.svg') return 'image/svg+xml'
  if (extension === '.png') return 'image/png'
  if (extension === '.xpm') return 'image/x-xpixmap'

  return 'application/octet-stream'
}

async function iconPathToDataUrl(iconPath) {
  if (!iconPath) return ''

  try {
    const buffer = await fs.readFile(iconPath)
    return `data:${getIconMimeType(iconPath)};base64,${buffer.toString('base64')}`
  } catch {
    return ''
  }
}

function dedupeApps(apps) {
  const seen = new Set()
  const uniqueApps = []

  for (const app of apps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))) {
    const key = app.name.toLocaleLowerCase()
    if (seen.has(key)) continue

    seen.add(key)
    uniqueApps.push(app)
  }

  return uniqueApps
}

export async function listLinuxDesktopApps(
  directories = [
    '/usr/share/applications',
    '/usr/local/share/applications',
    path.join(os.homedir(), '.local/share/applications'),
  ],
  options = {},
) {
  const files = (await Promise.all(directories.map((directory) => readDirectoryFiles(directory, '.desktop')))).flat()
  const apps = []

  for (const filePath of files) {
    try {
      const content = await fs.readFile(filePath, 'utf8')
      const app = parseDesktopEntry(content, filePath)

      if (app) {
        const iconPath = await resolveLinuxIconPath(app.icon, options.iconSearchRoots)
        apps.push({
          ...app,
          iconPath,
          iconDataUrl: await iconPathToDataUrl(iconPath),
        })
      }
    } catch {
      // Ignore broken launchers; the app list should still render.
    }
  }

  return dedupeApps(apps)
}

export async function listMacApps(
  directories = ['/Applications', path.join(os.homedir(), 'Applications')],
) {
  const apps = []

  for (const directory of directories) {
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true })

      for (const entry of entries) {
        if (!entry.isDirectory() || !entry.name.endsWith('.app')) continue

        const appPath = path.join(directory, entry.name)
        const name = entry.name.replace(/\.app$/, '')

        apps.push({
          id: appPath,
          name,
          description: '',
          command: appPath,
          icon: '',
          path: appPath,
          source: 'application',
          category: 'Application',
        })
      }
    } catch {
      // Missing application folders are expected on some systems.
    }
  }

  return dedupeApps(apps)
}

async function listWindowsStartMenuApps() {
  const directories = [
    path.join(process.env.ProgramData ?? 'C:\\ProgramData', 'Microsoft\\Windows\\Start Menu\\Programs'),
    path.join(process.env.AppData ?? '', 'Microsoft\\Windows\\Start Menu\\Programs'),
  ].filter(Boolean)
  const apps = []

  async function walk(directory) {
    let entries = []

    try {
      entries = await fs.readdir(directory, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      const itemPath = path.join(directory, entry.name)

      if (entry.isDirectory()) {
        await walk(itemPath)
        continue
      }

      if (!entry.isFile() || !entry.name.endsWith('.lnk')) continue

      apps.push({
        id: itemPath,
        name: entry.name.replace(/\.lnk$/i, ''),
        description: '',
        command: itemPath,
        icon: '',
        path: itemPath,
        source: 'shortcut',
        category: path.basename(path.dirname(itemPath)),
      })
    }
  }

  for (const directory of directories) {
    await walk(directory)
  }

  return dedupeApps(apps)
}

export async function listInstalledApps() {
  if (process.platform === 'linux') return listLinuxDesktopApps()
  if (process.platform === 'darwin') return listMacApps()
  if (process.platform === 'win32') return listWindowsStartMenuApps()

  return []
}

async function readInstalledAppsCache(cachePath) {
  try {
    const cache = JSON.parse(await fs.readFile(cachePath, 'utf8'))

    if (cache?.version !== CACHE_VERSION || !Array.isArray(cache.apps)) return null

    return cache.apps
  } catch {
    return null
  }
}

async function writeInstalledAppsCache(cachePath, apps) {
  await fs.mkdir(path.dirname(cachePath), { recursive: true })
  await fs.writeFile(
    cachePath,
    JSON.stringify(
      {
        version: CACHE_VERSION,
        createdAt: new Date().toISOString(),
        apps,
      },
      null,
      2,
    ),
  )
}

export async function loadInstalledApps({
  cachePath,
  forceRefresh = false,
  scan = listInstalledApps,
} = {}) {
  if (!cachePath) {
    return { apps: await scan(), source: 'scan' }
  }

  if (!forceRefresh) {
    const cachedApps = await readInstalledAppsCache(cachePath)

    if (cachedApps) return { apps: cachedApps, source: 'cache' }
  }

  const apps = await scan()
  await writeInstalledAppsCache(cachePath, apps)

  return { apps, source: 'scan' }
}

export async function openInstalledApp(appToOpen) {
  if (!appToOpen?.path && !appToOpen?.command) {
    throw new Error('Missing app path or command')
  }

  if (process.platform === 'darwin' && appToOpen.path?.endsWith('.app')) {
    await execFileAsync('open', [appToOpen.path])
    return true
  }

  if (process.platform === 'win32' && appToOpen.path?.endsWith('.lnk')) {
    await execFileAsync('cmd.exe', ['/c', 'start', '', appToOpen.path], { windowsHide: true })
    return true
  }

  if (process.platform === 'linux' && appToOpen.path?.endsWith('.desktop') && (await fileExists(appToOpen.path))) {
    await execFileAsync('gtk-launch', [path.basename(appToOpen.path, '.desktop')])
    return true
  }

  const command = appToOpen.command || appToOpen.path
  await execFileAsync(command, [], { shell: true })
  return true
}
