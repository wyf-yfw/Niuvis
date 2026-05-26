import fs from 'node:fs/promises'
import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
  newPath: z.string().min(1),
})

export const renameFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'rename_file',
  description: '重命名或移动文件/目录（单条路径）',
  riskLevel: 'medium',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`重命名：${input.path} → ${input.newPath}`, [input.path, input.newPath], {
      canRollback: true,
    }),
  async execute(input) {
    await fs.rename(input.path, input.newPath)

    return {
      summary: `已重命名为：${input.newPath}`,
      data: { from: input.path, to: input.newPath },
    }
  },
}
