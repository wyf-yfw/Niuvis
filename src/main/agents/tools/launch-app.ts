import { z } from 'zod'
import { openInstalledApp } from '../../installedApps.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().optional(),
  command: z.string().optional(),
  name: z.string().optional(),
})

export const launchAppTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'launch_app',
  description: '启动已安装应用（需提供 path 或 command）',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) =>
    previewForPaths(`启动应用：${input.name ?? input.path ?? input.command ?? '未知'}`, [
      input.path ?? '',
    ].filter(Boolean)),
  async execute(input) {
    if (!input.path && !input.command) {
      throw new Error('需要提供 path 或 command')
    }

    await openInstalledApp({
      id: input.path ?? input.command ?? input.name ?? 'app',
      name: input.name ?? '应用',
      path: input.path,
      command: input.command,
    })

    return {
      summary: `已尝试启动：${input.name ?? input.path ?? input.command}`,
      data: input,
    }
  },
}
