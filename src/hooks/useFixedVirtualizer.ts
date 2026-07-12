import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

/**
 * Thin wrapper around `useVirtualizer` for fixed-height rows.
 * Returns the virtualizer and a scroll container ref to attach to the scroll element.
 */
export function useFixedVirtualizer(
  count: number,
  estimateSize: number,
  options?: {
    scrollRef?: React.RefObject<HTMLDivElement | null>
    overscan?: number
  }
) {
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = options?.scrollRef ?? internalRef

  const virtualizer = useVirtualizer({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan: options?.overscan ?? VIRTUAL_OVERSCAN
  })

  return { virtualizer, scrollRef }
}
