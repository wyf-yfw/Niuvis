import { z } from 'zod'
import type { ToolDefinitionSummary } from '../../../shared/types/tools.js'
import { copyFileTool } from './copy-file.js'
import { createFileTool } from './create-file.js'
import { deleteFileTool } from './delete-file.js'
import { getFileMetaTool } from './get-file-meta.js'
import { getSystemInfoTool } from './get-system-info.js'
import { launchAppTool } from './launch-app.js'
import { listDirectoryTool } from './list-directory.js'
import { moveFileTool } from './move-file.js'
import { openPathTool } from './open-path.js'
import { readFileTool } from './read-file.js'
import { renameFileTool } from './rename-file.js'
import { searchFilesTool } from './search-files.js'
import type { AnyNiuvisTool } from './types.js'
import { webSearchTool } from './web-search.js'

export const ALL_TOOLS = [
  searchFilesTool,
  listDirectoryTool,
  readFileTool,
  getFileMetaTool,
  openPathTool,
  launchAppTool,
  getSystemInfoTool,
  webSearchTool,
  createFileTool,
  renameFileTool,
  moveFileTool,
  copyFileTool,
  deleteFileTool,
] as AnyNiuvisTool[]

const toolMap = new Map<string, AnyNiuvisTool>(ALL_TOOLS.map((tool) => [tool.name, tool]))

export function getToolByName(name: string): AnyNiuvisTool | null {
  return toolMap.get(name) ?? null
}

export function listToolDefinitions(): ToolDefinitionSummary[] {
  return ALL_TOOLS.map((tool) => ({
    name: tool.name,
    description: tool.description,
    riskLevel: tool.riskLevel,
    requiresConfirmation: tool.requiresConfirmation,
    inputSchema: z.toJSONSchema(tool.inputSchema) as Record<string, unknown>,
  }))
}

export function validateToolInput(tool: AnyNiuvisTool, input: unknown) {
  const parsed = tool.inputSchema.safeParse(input)

  if (!parsed.success) {
    const message = parsed.error.issues.map((issue) => issue.message).join('; ')
    throw new Error(`工具参数无效：${message}`)
  }

  return parsed.data
}
