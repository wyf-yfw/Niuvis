import { Surface, Typography } from '@heroui/react'

export default function OfficePage() {
  return (
    <Surface className="flex h-screen min-w-0 flex-1 flex-col bg-[#212121] !text-white" variant="transparent">
      <Surface className="border-b border-white/8 px-6 py-5" variant="transparent">
        <Typography.Heading className="text-2xl font-semibold !text-white" level={1}>
          办公室
        </Typography.Heading>
        <Typography.Paragraph className="mt-1 !text-white/50" size="sm">
          办公室页面后续再设计。
        </Typography.Paragraph>
      </Surface>

      <Surface className="flex flex-1 items-center justify-center px-6 text-center" variant="transparent">
        <Surface className="max-w-md" variant="transparent">
          <Typography.Heading className="!text-white" level={2}>
            办公室
          </Typography.Heading>
          <Typography.Paragraph className="mt-3 !text-white/50" size="sm">
            这里先保留一个简单页面，后面再接 Agent 可视化工作区。
          </Typography.Paragraph>
        </Surface>
      </Surface>
    </Surface>
  )
}
