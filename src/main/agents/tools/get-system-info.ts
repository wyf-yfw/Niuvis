import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { z } from 'zod'
import { listRoots } from '../../fileBrowser.js'
import type { NiuvisTool } from './types.js'
import { previewForPaths } from './helpers.js'

const inputSchema = z.object({})

export const getSystemInfoTool: NiuvisTool<z.infer<typeof inputSchema>> = {
  name: 'get_system_info',
  description: '获取平台、CPU、内存与磁盘信息',
  riskLevel: 'low',
  requiresConfirmation: false,
  inputSchema,
  preview: () => previewForPaths('读取系统信息', []),
  async execute() {
    const roots = await listRoots()
    const disks = []

    for (const root of roots) {
      try {
        const stat = await fs.statfs(root.path)
        disks.push({
          path: root.path,
          label: root.name,
          total: Number(stat.blocks) * Number(stat.bsize),
          free: Number(stat.bfree) * Number(stat.bsize),
        })
      } catch {
        disks.push({ path: root.path, label: root.name, total: null, free: null })
      }
    }

    return {
      summary: `${process.platform} · ${os.cpus().length} 核 · 可用内存 ${Math.round(os.freemem() / 1024 / 1024 / 1024)} GB`,
      data: {
        platform: process.platform,
        arch: process.arch,
        hostname: os.hostname(),
        release: os.release(),
        cpus: os.cpus().length,
        totalMemory: os.totalmem(),
        freeMemory: os.freemem(),
        uptime: os.uptime(),
        home: os.homedir(),
        disks,
      },
    }
  },
}
