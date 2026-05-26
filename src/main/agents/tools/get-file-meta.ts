import fs from 'node:fs/promises'
import { z } from 'zod'
import { guessMime } from '../../services/indexer/documents.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
})

export const getFileMetaTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'get_file_meta',
  description: '获取文件或目录的元数据',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) => previewForPaths(`读取元数据：${input.path}`, [input.path]),
  async execute(input) {
    const stat = await fs.stat(input.path)

    return {
      summary: `${stat.isDirectory() ? '目录' : '文件'} · ${stat.size} 字节`,
      data: {
        path: input.path,
        size: stat.size,
        isDirectory: stat.isDirectory(),
        modifiedAt: stat.mtime.toISOString(),
        mime: stat.isDirectory() ? 'inode/directory' : guessMime(input.path),
      },
    }
  },
}
