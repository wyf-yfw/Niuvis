import fs from 'node:fs/promises'
import { z } from 'zod'
import { readContentSnippet } from '../../services/indexer/documents.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const DIRECT_READ_LIMIT = 64 * 1024

const inputSchema = z.object({
  path: z.string().min(1),
  maxBytes: z.number().int().min(1).max(512 * 1024).optional(),
})

export const readFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'read_file',
  description: '读取文件内容（小文件直读，大文件抽取片段）',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`读取文件：${input.path}`, [input.path], {
      bytesAffected: input.maxBytes ?? DIRECT_READ_LIMIT,
    }),
  async execute(input) {
    const stat = await fs.stat(input.path)
    const limit = input.maxBytes ?? DIRECT_READ_LIMIT

    if (stat.size <= limit) {
      const buffer = await fs.readFile(input.path)
      const content = buffer.toString('utf8')

      return {
        summary: `已读取 ${stat.size} 字节`,
        data: { path: input.path, size: stat.size, content, mode: 'full' },
      }
    }

    const snippet = await readContentSnippet(input.path)

    return {
      summary: `文件较大（${stat.size} 字节），已抽取片段`,
      data: { path: input.path, size: stat.size, content: snippet, mode: 'snippet' },
    }
  },
}

export function readFileEffectiveRisk(size: number) {
  return size > DIRECT_READ_LIMIT ? 'medium' : 'low'
}
