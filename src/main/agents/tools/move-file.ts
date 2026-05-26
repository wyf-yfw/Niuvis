import fs from 'node:fs/promises'
import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  sourcePath: z.string().min(1),
  destinationPath: z.string().min(1),
})

export const moveFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'move_file',
  description: '移动文件或目录到新位置',
  riskLevel: 'medium',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`移动：${input.sourcePath} → ${input.destinationPath}`, [
      input.sourcePath,
      input.destinationPath,
    ], { canRollback: true }),
  async execute(input) {
    await fs.rename(input.sourcePath, input.destinationPath)

    return {
      summary: `已移动到：${input.destinationPath}`,
      data: { from: input.sourcePath, to: input.destinationPath },
    }
  },
}
