import path from 'node:path'

/** 扫描与监听时一律跳过的目录名（含大型 SDK / 仿真 / 包管理缓存） */
const SENSITIVE_SEGMENTS = [
  'node_modules',
  '.git',
  '.cache',
  '.venv',
  'venv',
  '__pycache__',
  '.ssh',
  '.gnupg',
  '.aws',
  'keychains',
  'login data',
  'cookies',
  '.password-store',
  'isaacsim',
  'extscache',
  '.omni',
  'omniverse',
  '.conda',
  'miniconda3',
  'anaconda3',
  '.npm',
  '.cargo',
  '.rustup',
  '.gradle',
  '.m2',
  '.local/share/flatpak',
  'snap',
  '.steam',
  'Steam',
  '.vscode',
  '.cursor',
  'target',
  'build',
  'dist',
  '.next',
  '.turbo',
  'Library/Caches',
  'AppData/Local/Temp',
]

function patternToNeedle(pattern: string) {
  return pattern
    .replace(/^\*\*\//, '')
    .replace(/\/\*\*$/, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/\//g, path.sep)
    .toLowerCase()
}

export function shouldExcludePath(targetPath: string, excludePatterns: string[] = []) {
  const normalized = path.normalize(targetPath)
  const lower = normalized.toLowerCase()
  const segments = lower.split(path.sep)

  for (const segment of SENSITIVE_SEGMENTS) {
    const seg = segment.toLowerCase()

    if (segments.includes(seg) || lower.includes(`${path.sep}${seg}${path.sep}`)) {
      return true
    }
  }

  for (const pattern of excludePatterns) {
    const needle = patternToNeedle(pattern)

    if (!needle) continue

    if (lower.includes(needle)) {
      return true
    }
  }

  return false
}

export function shouldExcludeDirectoryName(name: string) {
  if (!name || name === '.' || name === '..') return true

  return shouldExcludePath(path.join('root', name), [])
}
