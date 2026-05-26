import fs from 'node:fs/promises'
import path from 'node:path'
import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
  content: z.string().default(''),
})

export const createFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'create_file',
  description: '创建新文件（若已存在则失败，不覆盖）',
  riskLevel: 'medium',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`创建文件：${input.path}`, [input.path], {
      bytesAffected: Buffer.byteLength(input.content, 'utf8'),
      previewText: input.content.slice(0, 200),
      canRollback: true,
    }),
  async execute(input) {
    await fs.mkdir(path.dirname(input.path), { recursive: true })
    await fs.writeFile(input.path, input.content, { encoding: 'utf8', flag: 'wx' })

    return {
      summary: `已创建：${input.path}`,
      data: { path: input.path, bytes: Buffer.byteLength(input.content, 'utf8') },
    }
  },
}
