import fs from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'

const SNIPPET_MAX_BYTES = 8 * 1024

const TEXT_EXTENSIONS = new Set([
  'txt',
  'md',
  'markdown',
  'json',
  'js',
  'ts',
  'tsx',
  'jsx',
  'py',
  'html',
  'css',
  'xml',
  'yaml',
  'yml',
  'csv',
  'log',
  'sh',
  'rb',
  'go',
  'rs',
  'java',
  'kt',
  'swift',
  'c',
  'cpp',
  'h',
  'hpp',
  'sql',
  'toml',
  'ini',
  'env',
])

const DOCUMENT_EXTENSIONS = new Set([
  ...TEXT_EXTENSIONS,
  'pdf',
  'doc',
  'docx',
  'ppt',
  'pptx',
  'xls',
  'xlsx',
  'rtf',
])

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'bmp', 'ico', 'heic'])

export function getExtension(filePath: string) {
  return path.extname(filePath).slice(1).toLowerCase()
}

export function classifyIndexKind(filePath: string): 'image' | 'document' | 'file' {
  const ext = getExtension(filePath)

  if (IMAGE_EXTENSIONS.has(ext)) {
    return 'image'
  }

  if (DOCUMENT_EXTENSIONS.has(ext)) {
    return 'document'
  }

  return 'file'
}

export function guessMime(filePath: string) {
  const ext = getExtension(filePath)

  if (IMAGE_EXTENSIONS.has(ext)) {
    return `image/${ext === 'jpg' ? 'jpeg' : ext}`
  }

  if (ext === 'md' || ext === 'markdown') return 'text/markdown'
  if (ext === 'json') return 'application/json'
  if (ext === 'pdf') return 'application/pdf'
  if (TEXT_EXTENSIONS.has(ext)) return 'text/plain'

  return `application/octet-stream`
}

function normalizeSnippet(text: string) {
  const cleaned = text.replace(/\u0000/g, '').replace(/\s+/g, ' ').trim()

  if (!cleaned) {
    return ''
  }

  const buffer = Buffer.from(cleaned, 'utf8')

  if (buffer.length <= SNIPPET_MAX_BYTES) {
    return cleaned
  }

  return buffer.subarray(0, SNIPPET_MAX_BYTES).toString('utf8')
}

async function readTextFileSnippet(filePath: string) {
  const handle = await fs.open(filePath, 'r')
  const buffer = Buffer.alloc(SNIPPET_MAX_BYTES)

  try {
    const { bytesRead } = await handle.read(buffer, 0, SNIPPET_MAX_BYTES, 0)
    return normalizeSnippet(buffer.slice(0, bytesRead).toString('utf8'))
  } finally {
    await handle.close()
  }
}

async function readDocxSnippet(filePath: string) {
  const result = await mammoth.extractRawText({ path: filePath })
  return normalizeSnippet(result.value)
}

async function readPdfSnippet(filePath: string) {
  const { PDFParse } = await import('pdf-parse')
  const buffer = await fs.readFile(filePath)
  const parser = new PDFParse({ data: buffer })

  try {
    const result = await parser.getText({ first: 3, pageJoiner: ' ' })
    return normalizeSnippet(result.text ?? '')
  } finally {
    await parser.destroy()
  }
}

export async function readContentSnippet(filePath: string) {
  const ext = getExtension(filePath)

  try {
    if (TEXT_EXTENSIONS.has(ext)) {
      return await readTextFileSnippet(filePath)
    }

    if (ext === 'docx') {
      return await readDocxSnippet(filePath)
    }

    if (ext === 'pdf') {
      return await readPdfSnippet(filePath)
    }
  } catch {
    return ''
  }

  return ''
}
