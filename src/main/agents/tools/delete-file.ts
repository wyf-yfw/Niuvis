import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
})

export const deleteFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'delete_file',
  description: '将文件或目录移到系统回收站（不可硬删除）',
  riskLevel: 'high',
  requiresConfirmation: true,
  inputSchema,
  preview: (input) =>
    previewForPaths(`删除到回收站：${input.path}`, [input.path], {
      canRollback: false,
    }),
  async execute(input) {
    const { shell } = await import('electron')
    await shell.trashItem(input.path)

    return {
      summary: `已移到回收站：${input.path}`,
      data: { path: input.path },
    }
  },
}
