import { useState } from 'react'
import { Button, Card, Chip, Surface, Typography } from '@heroui/react'
import type { PendingToolCall, ToolRiskLevel } from '../../../shared/types/tools'

const RISK_LABELS: Record<ToolRiskLevel, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
}

const RISK_COLORS: Record<ToolRiskLevel, 'success' | 'warning' | 'danger'> = {
  low: 'success',
  medium: 'warning',
  high: 'danger',
}

interface ToolConfirmCardProps {
  pending: PendingToolCall
  busy?: boolean
  onApprove: (rememberMinutes?: number) => void
  onReject: () => void
}

export default function ToolConfirmCard({ pending, busy = false, onApprove, onReject }: ToolConfirmCardProps) {
  const [remember, setRemember] = useState(false)

  return (
    <Card className="border border-amber-400/25 bg-[#2a2a2a]">
      <Card.Content className="flex flex-col gap-3 p-4">
        <Surface className="flex flex-wrap items-center gap-2" variant="transparent">
          <Typography className="font-semibold !text-white" type="body-md">
            需要确认：{pending.toolName}
          </Typography>
          <Chip color={RISK_COLORS[pending.riskLevel]} size="sm" variant="soft">
            {RISK_LABELS[pending.riskLevel]}
          </Chip>
        </Surface>

        <Typography className="!text-white/75" type="body-sm">
          {pending.preview.summary}
        </Typography>

        {pending.preview.affectedPaths.length > 0 && (
          <Surface className="max-h-28 overflow-y-auto rounded-md border border-white/10 bg-black/20 px-3 py-2" variant="transparent">
            {pending.preview.affectedPaths.map((itemPath) => (
              <Typography key={itemPath} className="break-all !text-white/55" type="body-sm">
                {itemPath}
              </Typography>
            ))}
          </Surface>
        )}

        {pending.preview.previewText && (
          <Surface className="rounded-md border border-white/10 bg-black/20 px-3 py-2" variant="transparent">
            <Typography className="mb-1 !text-white/45" type="body-sm">
              内容预览
            </Typography>
            <Typography className="whitespace-pre-wrap break-words !text-white/70" type="body-sm">
              {pending.preview.previewText}
            </Typography>
          </Surface>
        )}

        <label className="flex cursor-pointer items-center gap-2 text-sm text-white/60">
          <input
            checked={remember}
            className="size-4 rounded border-white/20"
            type="checkbox"
            onChange={(event) => setRemember(event.target.checked)}
          />
          接下来 10 分钟内，同类低风险/中风险操作自动确认
        </label>

        <Surface className="flex flex-wrap gap-2" variant="transparent">
          <Button
            className="bg-emerald-600 text-white hover:bg-emerald-500"
            isDisabled={busy}
            variant="primary"
            onPress={() => onApprove(remember ? 10 : undefined)}
          >
            确认执行
          </Button>
          <Button
            className="border border-white/15 text-white"
            isDisabled={busy}
            variant="outline"
            onPress={onReject}
          >
            拒绝
          </Button>
        </Surface>
      </Card.Content>
    </Card>
  )
}
