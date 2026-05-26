import { z } from 'zod'
import { listDirectory } from '../../fileBrowser.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  path: z.string().min(1),
})

export const listDirectoryTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'list_directory',
  description: '列出目录中的文件和文件夹',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) => previewForPaths(`列出目录：${input.path}`, [input.path]),
  async execute(input) {
    const listing = await listDirectory(input.path)

    return {
      summary: `目录包含 ${listing.items.length} 项`,
      data: listing,
    }
  },
}
