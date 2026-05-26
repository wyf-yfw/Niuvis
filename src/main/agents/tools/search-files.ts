import { z } from 'zod'
import { searchComputerIndex } from '../../services/database/indexItems.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  query: z.string().min(1),
  kind: z.enum(['app', 'file', 'document', 'image']).optional(),
  limit: z.number().int().min(1).max(100).optional(),
})

export const searchFilesTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'search_files',
  description: '在已索引的电脑文件中搜索',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) => previewForPaths(`搜索：${input.query}`, []),
  async execute(input) {
    const result = searchComputerIndex({
      query: input.query,
      kind: input.kind,
      limit: input.limit ?? 20,
    })

    return {
      summary: `找到 ${result.total} 条结果（展示 ${result.items.length} 条）`,
      data: {
        total: result.total,
        tookMs: result.tookMs,
        items: result.items.map((item) => ({
          kind: item.kind,
          name: item.name,
          path: item.path,
          highlight: item.highlight,
        })),
      },
    }
  },
}
