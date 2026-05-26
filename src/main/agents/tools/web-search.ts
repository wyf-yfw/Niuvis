import { z } from 'zod'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({
  query: z.string().min(1),
})

export const webSearchTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'web_search',
  description: '网页搜索（需在设置中配置搜索后端，当前为占位实现）',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: (input) => previewForPaths(`网页搜索：${input.query}`, []),
  async execute(input) {
    return {
      summary: '未配置网页搜索后端',
      data: {
        query: input.query,
        results: [],
        hint: '请在后续版本于设置中配置搜索 API；本阶段仅保留工具接口。',
      },
    }
  },
}
