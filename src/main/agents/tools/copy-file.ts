import fs from 'node:fs/promises'
import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { backupFileIfExists, previewForPaths } from './helpers.js'

const inputSchema = z.object({
  sourcePath: z.string().min(1),
  destinationPath: z.string().min(1),
})

export const copyFileTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'copy_file',
  description: '复制文件或目录；若目标已存在会先备份',
  riskLevel: 'medium',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`复制：${input.sourcePath} → ${input.destinationPath}`, [
      input.sourcePath,
      input.destinationPath,
    ]),
  async execute(input) {
    const backupPath = await backupFileIfExists(input.destinationPath)

    await fs.cp(input.sourcePath, input.destinationPath, { recursive: true, force: true })

    return {
      summary: backupPath
        ? `已复制（原目标已备份到 ${backupPath}）`
        : `已复制到：${input.destinationPath}`,
      data: { from: input.sourcePath, to: input.destinationPath, backupPath },
    }
  },
}
