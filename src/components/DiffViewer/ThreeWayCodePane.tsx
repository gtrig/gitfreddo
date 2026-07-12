import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Checkbox } from '@/components/Ui/Modal'
import type { LineRange } from '@/lib/conflicts/threeWayMerge'
import { CODE_LINE_HEIGHT, VIRTUAL_OVERSCAN } from '@/lib/ui/virtualList'

const ROW_GRID = 'grid-cols-[28px_44px_minmax(0,1fr)]'

interface ThreeWayCodePaneProps {
  label: string
  sublabel?: string
  content: string
  highlightRange?: LineRange | null
  highlightClass?: string
  headerClass?: string
  /** File line numbers (1-based) within highlightRange that are checked */
  checkedLines?: Set<number>
  onLineToggle?: (lineNo: number) => void
  onSelectAll?: () => void
  allSelected?: boolean
  scrollRef?: React.RefObject<HTMLDivElement>
  onScroll?: (scrollTop: number) => void
}

export function ThreeWayCodePane({
  label,
  sublabel,
  content,
  highlightRange,
  highlightClass = 'bg-sky-500/25',
  headerClass = 'bg-sky-500/15 text-sky-200',
  checkedLines,
  onLineToggle,
  onSelectAll,
  allSelected,
  scrollRef: externalScrollRef,
  onScroll
}: ThreeWayCodePaneProps) {
  const { t } = useTranslation()
  const internalRef = useRef<HTMLDivElement>(null)
  const scrollRef = (externalScrollRef ?? internalRef) as React.RefObject<HTMLDivElement>
  const lines = content.split('\n')

  const virtualizer = useVirtualizer({
    count: lines.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => CODE_LINE_HEIGHT,
    overscan: VIRTUAL_OVERSCAN
  })

  useEffect(() => {
    if (!highlightRange) return
    virtualizer.scrollToIndex(highlightRange.start - 1, { align: 'start' })
  // virtualizer is stable ref, no need to include
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightRange])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border border-gf-border">
      <div className={`grid shrink-0 ${ROW_GRID} border-b border-gf-border ${headerClass}`}>
        <span className="flex items-center justify-center px-1 py-1.5">
          {onSelectAll && highlightRange && (
            <Checkbox
              size="sm"
              checked={allSelected ?? false}
              onChange={() => onSelectAll()}
              aria-label={t('diff.selectAllLines', { label })}
              title={t('diff.selectAllLinesTitle', { label })}
            />
          )}
        </span>
        <span className="border-r border-gf-border/50 px-2 py-1.5" />
        <div className="min-w-0 px-2 py-1.5">
          <p className="truncate text-[11px] font-semibold">{label}</p>
          {sublabel && <p className="truncate text-[10px] opacity-80">{sublabel}</p>}
        </div>
      </div>
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5"
        onScroll={onScroll ? (event) => onScroll(event.currentTarget.scrollTop) : undefined}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const lineNo = virtualItem.index + 1
            const line = lines[virtualItem.index] ?? ''
            const inConflict =
              highlightRange && lineNo >= highlightRange.start && lineNo <= highlightRange.end
            const checked = checkedLines?.has(lineNo) ?? false

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
                className={`grid ${ROW_GRID} ${inConflict ? highlightClass : ''}`}
              >
                <span className="flex items-center justify-center">
                  {inConflict && onLineToggle && (
                    <Checkbox
                      size="xs"
                      checked={checked}
                      onChange={() => onLineToggle(lineNo)}
                      aria-label={`Include line ${lineNo} in output`}
                    />
                  )}
                </span>
                <span className="select-none border-r border-gf-border/50 px-2 text-right text-gf-fg-subtle">
                  {lineNo}
                </span>
                <span className="whitespace-pre px-2 text-gf-fg-muted">{line || ' '}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
