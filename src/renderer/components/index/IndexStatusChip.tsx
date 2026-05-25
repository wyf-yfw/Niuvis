import { useCallback, useEffect, useRef, useState } from 'react'
import { Chip } from '@heroui/react'
import { formatIpcError } from '../../lib/ipcError'
import { getNonElectronHint } from '../../lib/runtime'
import type { IndexStatus } from '../../shared/types/computerIndex'

function formatScanTime(value: string | null, itemCount: number) {
  if (!value) {
    return itemCount > 0 ? '已索引（完成时间未记录）' : '尚未扫描'
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

interface IndexStatusChipProps {
  /** 仅在索引从「进行中」变为「完成」时回调，避免轮询导致列表页反复重载 */
  onIndexCompleted?: () => void
}

export default function IndexStatusChip({ onIndexCompleted }: IndexStatusChipProps) {
  const [status, setStatus] = useState<IndexStatus | null>(null)
  const [starting, setStarting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wasRunningRef = useRef(false)

  const refresh = useCallback(async () => {
    if (!window.niuvisIndex?.status) return

    const next = await window.niuvisIndex.status()
    setStatus(next)

    if (wasRunningRef.current && !next.running && next.itemCount > 0) {
      onIndexCompleted?.()
    }

    wasRunningRef.current = next.running
  }, [onIndexCompleted])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (!status?.running && !starting) {
      return
    }

    const timer = setInterval(() => {
      void refresh()
    }, 3000)

    return () => clearInterval(timer)
  }, [status?.running, starting, refresh])

  const handlePress = async () => {
    if (!window.niuvisIndex?.start) {
      setError(getNonElectronHint())
      return
    }

    if (status?.running || starting) return

    setStarting(true)
    setError(null)

    try {
      await window.niuvisIndex.start()
      await refresh()
    } catch (err) {
      setError(formatIpcError(err) || '索引失败')
    } finally {
      setStarting(false)
    }
  }

  const label = status
    ? status.running || starting
      ? status.lastScanAt
        ? `索引中… ${status.itemCount} 项`
        : `首次索引中… ${status.itemCount} 项`
      : `已索引 ${status.itemCount} 项 · ${formatScanTime(status.lastScanAt, status.itemCount)}`
    : '加载索引状态…'

  return (
    <Chip
      className="cursor-pointer border border-white/12 bg-white/[0.06] text-white/80"
      color={status?.status === 'error' ? 'danger' : 'default'}
      title={status?.databasePath ? `索引已写入 SQLite：${status.databasePath}` : undefined}
      variant="secondary"
      onClick={() => void handlePress()}
    >
      {error ?? label}
    </Chip>
  )
}
