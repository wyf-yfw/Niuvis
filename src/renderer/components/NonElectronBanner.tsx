import { Surface, Typography } from '@heroui/react'
import { isElectronRuntime } from '../lib/runtime'

export default function NonElectronBanner() {
  if (isElectronRuntime()) {
    return null
  }

  return (
    <Surface
      className="shrink-0 border-b border-amber-500/30 bg-amber-950/80 px-4 py-2 !text-amber-100"
      variant="transparent"
    >
      <Typography.Paragraph className="text-xs leading-5 !text-amber-100" size="sm">
        当前在浏览器中打开，无法使用本机能力。请关闭此标签，在项目目录运行{' '}
        <code className="rounded bg-black/30 px-1 py-0.5">npm run dev</code>，使用弹出的
        Electron 窗口操作。
      </Typography.Paragraph>
    </Surface>
  )
}
