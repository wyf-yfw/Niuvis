import { useState } from 'react'
import { Button, Card, Chip, Surface, Typography } from '@heroui/react'
import { ChevronDown, ChevronRight, Wrench } from 'lucide-react'
import type { ToolStepRecord } from '../../../shared/types/chat'

interface ToolStepsCardProps {
  steps: ToolStepRecord[]
}

export default function ToolStepsCard({ steps }: ToolStepsCardProps) {
  const [open, setOpen] = useState(true)

  if (steps.length === 0) return null

  return (
    <Card className="border border-white/10 bg-[#2a2a2a]/80">
      <Card.Content className="p-3">
        <Surface className="flex items-center justify-between gap-2" variant="transparent">
          <Surface className="flex items-center gap-2" variant="transparent">
            <Wrench className="size-4 text-blue-300" />
            <Typography className="font-medium !text-white" type="body-sm">
              工具调用（{steps.length}）
            </Typography>
          </Surface>
          <Button
            isIconOnly
            className="text-white/60"
            size="sm"
            variant="ghost"
            onPress={() => setOpen((value) => !value)}
          >
            {open ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </Button>
        </Surface>

        {open && (
          <Surface className="mt-3 flex flex-col gap-2" variant="transparent">
            {steps.map((step) => (
              <Surface
                key={step.id}
                className="rounded-lg border border-white/8 bg-black/20 px-3 py-2"
                variant="transparent"
              >
                <Surface className="flex flex-wrap items-center gap-2" variant="transparent">
                  <Typography className="font-mono text-xs text-blue-300" type="body-sm">
                    {step.toolName}
                  </Typography>
                  <Chip
                    color={
                      step.status === 'completed'
                        ? 'success'
                        : step.status === 'failed'
                          ? 'danger'
                          : 'warning'
                    }
                    size="sm"
                    variant="soft"
                  >
                    {step.status}
                  </Chip>
                  {step.durationMs != null && (
                    <Typography className="!text-white/40" type="body-sm">
                      {step.durationMs}ms
                    </Typography>
                  )}
                </Surface>
                {step.summary && (
                  <Typography className="mt-1 !text-white/70" type="body-sm">
                    {step.summary}
                  </Typography>
                )}
              </Surface>
            ))}
          </Surface>
        )}
      </Card.Content>
    </Card>
  )
}
