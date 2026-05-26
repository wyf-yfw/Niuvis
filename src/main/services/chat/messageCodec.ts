import type { ChatMessageMeta } from '../../../shared/types/chat.js'

const META_MARKER = '\n\n---niuvis-meta---\n'

export function packMessageContent(content: string, meta?: ChatMessageMeta) {
  if (!meta || Object.keys(meta).length === 0) {
    return content
  }

  return `${content}${META_MARKER}${JSON.stringify(meta)}`
}

export function unpackMessageContent(raw: string): { content: string; meta?: ChatMessageMeta } {
  const index = raw.indexOf(META_MARKER)

  if (index === -1) {
    return { content: raw }
  }

  const content = raw.slice(0, index)
  const metaText = raw.slice(index + META_MARKER.length)

  try {
    return { content, meta: JSON.parse(metaText) as ChatMessageMeta }
  } catch {
    return { content: raw }
  }
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}
