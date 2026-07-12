import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

interface FixedHeightVirtualListProps<T> {
  items: T[]
  estimateSize: number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  /** Attach an external ref to the scroll container (e.g. for synced pane scroll). */
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (scrollTop: number) => void
  overscan?: number
}

/**
 * Virtualizes a list of fixed-height items. The component owns its scroll container.
 * Pass `scrollRef` to expose the scroll element to a parent for synchronized scrolling.
 */
export function FixedHeightVirtualList<T>({
  items,
  estimateSize,
  renderItem,
  className,
  scrollRef: externalRef,
  onScroll,
  overscan = VIRTUAL_OVERSCAN
}: FixedHeightVirtualListProps<T>) {
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = (externalRef ?? internalRef) as React.RefObject<HTMLDivElement>

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => estimateSize,
    overscan
  })

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto${className ? ` ${className}` : ''}`}
      onScroll={onScroll ? (e) => onScroll(e.currentTarget.scrollTop) : undefined}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`
            }}
          >
            {renderItem(items[virtualItem.index]!, virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  )
}
