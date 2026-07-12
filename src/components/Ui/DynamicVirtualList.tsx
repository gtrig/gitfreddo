import { useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

interface DynamicVirtualListProps<T> {
  items: T[]
  estimateSize: (index: number) => number
  renderItem: (item: T, index: number) => React.ReactNode
  className?: string
  scrollRef?: React.RefObject<HTMLDivElement | null>
  onScroll?: (scrollTop: number) => void
  overscan?: number
}

/**
 * Virtualizes a list of variable-height items using `measureElement`.
 * The component owns its scroll container.
 */
export function DynamicVirtualList<T>({
  items,
  estimateSize,
  renderItem,
  className,
  scrollRef: externalRef,
  onScroll,
  overscan = VIRTUAL_OVERSCAN
}: DynamicVirtualListProps<T>) {
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = (externalRef ?? internalRef) as React.RefObject<HTMLDivElement>

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan,
    measureElement:
      typeof window !== 'undefined'
        ? (el) => el.getBoundingClientRect().height
        : undefined
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
            data-index={virtualItem.index}
            ref={virtualizer.measureElement}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
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
