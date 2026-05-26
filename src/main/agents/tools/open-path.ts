import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
})

export const openPathTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'open_path',
  description: '使用系统默认应用打开文件或目录',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) => previewForPaths(`打开：${input.path}`, [input.path]),
  async execute(input) {
    const { shell } = await import('electron')
    const result = await shell.openPath(input.path)

    if (result) {
      throw new Error(result)
    }

    return {
      summary: `已打开：${input.path}`,
      data: { path: input.path },
    }
  },
}
