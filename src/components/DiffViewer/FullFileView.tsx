import { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { CODE_LINE_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

const ROW_GRID = 'grid-cols-[44px_minmax(0,1fr)]'

export function FullFileView({
  content,
  loading,
  className
}: {
  content: string
  loading?: boolean
  className?: string
}) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const lines = content.split('\n')

  const virtualizer = useVirtualizer({
    count: loading ? 0 : lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CODE_LINE_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  if (loading) {
    return <p className="px-4 py-6 text-sm text-gf-fg-subtle">{t('diff.loadingFile')}</p>
  }

  return (
    <div
      ref={scrollRef}
      className={`overflow-auto font-mono text-[12px] leading-5${className ? ` ${className}` : ''}`}
    >
      <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const lineNo = virtualItem.index + 1
          const text = lines[virtualItem.index] ?? ''
          return (
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
              className={`grid ${ROW_GRID} text-gf-fg-muted`}
            >
              <span className="select-none border-r border-gf-border/50 px-2 text-right text-gf-fg-subtle">
                {lineNo}
              </span>
              <span className="whitespace-pre px-2">{text || ' '}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
