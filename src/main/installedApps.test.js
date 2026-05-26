import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {
  attachWindowsAppIcons,
  listLinuxDesktopApps,
  loadInstalledApps,
  normalizeExecCommand,
  parseDesktopEntry,
  resolveLinuxIconPath,
} from './installedApps.js'

test('parseDesktopEntry reads visible desktop launchers', () => {
  const entry = parseDesktopEntry(
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Visual Studio Code',
      'Comment=Code Editing. Redefined.',
      'Exec=/usr/share/code/code --unity-launch %F',
      'Icon=com.visualstudio.code',
      'Categories=Utility;TextEditor;Development;',
    ].join('\n'),
    '/usr/share/applications/code.desktop',
  )

  assert.deepEqual(entry, {
    id: 'code',
    name: 'Visual Studio Code',
    description: 'Code Editing. Redefined.',
    command: '/usr/share/code/code --unity-launch',
    icon: 'com.visualstudio.code',
    path: '/usr/share/applications/code.desktop',
    source: 'desktop',
    category: 'Development',
  })
})

test('parseDesktopEntry skips hidden and non-application entries', () => {
  assert.equal(
    parseDesktopEntry(
      ['[Desktop Entry]', 'Type=Application', 'Name=Hidden', 'NoDisplay=true'].join('\n'),
      '/tmp/hidden.desktop',
    ),
    null,
  )
  assert.equal(
    parseDesktopEntry(
      ['[Desktop Entry]', 'Type=Link', 'Name=Docs', 'URL=https://example.com'].join('\n'),
      '/tmp/link.desktop',
    ),
    null,
  )
})

test('normalizeExecCommand removes freedesktop placeholders', () => {
  assert.equal(
    normalizeExecCommand('"/opt/My App/app" --open %U --name %c --icon %i'),
    '"/opt/My App/app" --open',
  )
})

test('listLinuxDesktopApps reads launchers from provided directories and de-duplicates names', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-apps-'))
  const systemDir = path.join(root, 'system')
  const userDir = path.join(root, 'user')

  await mkdir(systemDir, { recursive: true })
  await mkdir(userDir, { recursive: true })
  await writeFile(
    path.join(systemDir, 'alpha.desktop'),
    ['[Desktop Entry]', 'Type=Application', 'Name=Alpha', 'Exec=/usr/bin/alpha', 'Categories=Utility;'].join('\n'),
  )
  await writeFile(
    path.join(userDir, 'alpha-copy.desktop'),
    ['[Desktop Entry]', 'Type=Application', 'Name=Alpha', 'Exec=/home/me/alpha'].join('\n'),
  )
  await writeFile(
    path.join(userDir, 'beta.desktop'),
    ['[Desktop Entry]', 'Type=Application', 'Name=Beta', 'Exec=/usr/bin/beta %U'].join('\n'),
  )

  try {
    const apps = await listLinuxDesktopApps([systemDir, userDir])

    assert.equal(apps.length, 2)
    assert.deepEqual(
      apps.map((app) => app.name),
      ['Alpha', 'Beta'],
    )
    assert.equal(apps[1].command, '/usr/bin/beta')
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('listLinuxDesktopApps resolves named Linux icons into data urls', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-icons-'))
  const appDir = path.join(root, 'applications')
  const iconDir = path.join(root, 'icons/hicolor/48x48/apps')

  await mkdir(appDir, { recursive: true })
  await mkdir(iconDir, { recursive: true })
  await writeFile(
    path.join(appDir, 'gamma.desktop'),
    [
      '[Desktop Entry]',
      'Type=Application',
      'Name=Gamma',
      'Exec=/usr/bin/gamma',
      'Icon=gamma',
    ].join('\n'),
  )
  await writeFile(path.join(iconDir, 'gamma.svg'), '<svg xmlns="http://www.w3.org/2000/svg" />')

  try {
    const apps = await listLinuxDesktopApps([appDir], { iconSearchRoots: [path.join(root, 'icons')] })

    assert.equal(apps[0].iconPath, path.join(iconDir, 'gamma.svg'))
    assert.match(apps[0].iconDataUrl, /^data:image\/svg\+xml;base64,/)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('resolveLinuxIconPath supports absolute icon paths and theme directories', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-icon-resolve-'))
  const absoluteIcon = path.join(root, 'absolute.png')
  const themeIcon = path.join(root, 'theme/64x64/apps/themed.png')

  await mkdir(path.dirname(themeIcon), { recursive: true })
  await writeFile(absoluteIcon, 'png')
  await writeFile(themeIcon, 'png')

  try {
    assert.equal(await resolveLinuxIconPath(absoluteIcon, [root]), absoluteIcon)
    assert.equal(await resolveLinuxIconPath('themed', [path.join(root, 'theme')]), themeIcon)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('attachWindowsAppIcons enriches apps using the icon resolver', async () => {
  const apps = [
    {
      id: 'chrome',
      name: 'Google Chrome',
      path: 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Google Chrome.lnk',
      source: 'shortcut',
    },
  ]

  const enriched = await attachWindowsAppIcons(apps, async () => ({
    iconPath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    iconDataUrl: 'data:image/png;base64,chrome',
  }))

  assert.equal(enriched[0].iconPath, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe')
  assert.equal(enriched[0].iconDataUrl, 'data:image/png;base64,chrome')
})

test('loadInstalledApps returns cache first and refresh overwrites it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-cache-'))
  const cachePath = path.join(root, 'installed-apps-cache.json')
  const cachedApps = [{ id: 'cached', name: 'Cached App' }]
  const scannedApps = [{ id: 'fresh', name: 'Fresh App' }]
  let scanCount = 0

  await writeFile(
    cachePath,
    JSON.stringify({
      version: 2,
      createdAt: '2026-05-25T00:00:00.000Z',
      apps: cachedApps,
    }),
  )

  try {
    const cachedResult = await loadInstalledApps({
      cachePath,
      scan: async () => {
        scanCount += 1
        return scannedApps
      },
    })

    assert.deepEqual(cachedResult, { apps: cachedApps, source: 'cache' })
    assert.equal(scanCount, 0)

    const freshResult = await loadInstalledApps({
      cachePath,
      forceRefresh: true,
      scan: async () => {
        scanCount += 1
        return scannedApps
      },
    })
    const savedCache = JSON.parse(await readFile(cachePath, 'utf8'))

    assert.deepEqual(freshResult, { apps: scannedApps, source: 'scan' })
    assert.equal(scanCount, 1)
    assert.deepEqual(savedCache.apps, scannedApps)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})

test('loadInstalledApps scans when cache is missing', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'niuvis-cache-missing-'))
  const cachePath = path.join(root, 'installed-apps-cache.json')
  const scannedApps = [{ id: 'fresh', name: 'Fresh App' }]

  try {
    const result = await loadInstalledApps({
      cachePath,
      scan: async () => scannedApps,
    })

    assert.deepEqual(result, { apps: scannedApps, source: 'scan' })
    assert.deepEqual(JSON.parse(await readFile(cachePath, 'utf8')).apps, scannedApps)
  } finally {
    await rm(root, { force: true, recursive: true })
  }
})
