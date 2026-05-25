import { useCallback, useState } from 'react'
import { INDEX_PAGE_SIZE } from '../lib/indexBrowse'
import type { ComputerIndexItem, ComputerIndexKind } from '../../shared/types/computerIndex'

interface UsePaginatedIndexBrowseOptions<T> {
  kind: ComputerIndexKind
  mapItem: (item: ComputerIndexItem) => T
}

export function usePaginatedIndexBrowse<T>({ kind, mapItem }: UsePaginatedIndexBrowseOptions<T>) {
  const [items, setItems] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [active, setActive] = useState(false)

  const loadPage = useCallback(
    async (reset: boolean) => {
      if (!window.niuvisIndex?.list) return false

      const nextOffset = reset ? 0 : offset

      if (reset) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      try {
        const result = await window.niuvisIndex.list({
          kind,
          limit: INDEX_PAGE_SIZE,
          offset: nextOffset,
        })

        const mapped = result.items.map(mapItem)

        setItems((prev) => (reset ? mapped : [...prev, ...mapped]))
        setTotal(result.total)
        setOffset(nextOffset + mapped.length)
        setActive(true)
        return mapped.length > 0
      } finally {
        setLoading(false)
        setLoadingMore(false)
      }
    },
    [kind, mapItem, offset],
  )

  const startBrowse = useCallback(async () => {
    await loadPage(true)
  }, [loadPage])

  const loadMore = useCallback(async () => {
    if (items.length >= total) return
    await loadPage(false)
  }, [items.length, loadPage, total])

  const resetBrowse = useCallback(() => {
    setItems([])
    setTotal(0)
    setOffset(0)
    setActive(false)
  }, [])

  return {
    items,
    setItems,
    total,
    offset,
    loading,
    loadingMore,
    active,
    startBrowse,
    loadMore,
    resetBrowse,
    reloadFirstPage: () => loadPage(true),
  }
}
