import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

/**
 * Thin wrapper around `useVirtualizer` for variable-height rows.
 * Uses `measureElement` to measure actual item heights after render.
 */
export function useDynamicVirtualizer(
  count: number,
  estimateSize: (index: number) => number,
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
    estimateSize,
    overscan: options?.overscan ?? VIRTUAL_OVERSCAN,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined
  })

  return { virtualizer, scrollRef }
}
