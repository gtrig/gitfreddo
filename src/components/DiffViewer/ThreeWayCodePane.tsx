import { useEffect, useRef } from 'react'
import type { LineRange } from '@/lib/threeWayMerge'

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
  scrollRef,
  onScroll
}: ThreeWayCodePaneProps) {
  const localRef = useRef<HTMLDivElement>(null)
  const containerRef: React.RefObject<HTMLDivElement> = scrollRef ?? localRef
  const lines = content.split('\n')

  useEffect(() => {
    if (!highlightRange || !containerRef.current) return
    const lineHeight = 20
    const targetTop = (highlightRange.start - 1) * lineHeight
    containerRef.current.scrollTop = Math.max(0, targetTop - 40)
  }, [highlightRange, containerRef])

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col border border-gf-border">
      <div className={`grid shrink-0 ${ROW_GRID} border-b border-gf-border ${headerClass}`}>
        <span className="flex items-center justify-center px-1 py-1.5">
          {onSelectAll && highlightRange && (
            <input
              type="checkbox"
              checked={allSelected ?? false}
              onChange={onSelectAll}
              className="h-3.5 w-3.5 shrink-0 rounded border-gf-border-strong"
              aria-label={`Select all ${label} lines`}
              title={`Select all ${label} lines for this conflict`}
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
        ref={containerRef}
        className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5"
        onScroll={(event) => onScroll?.(event.currentTarget.scrollTop)}
      >
        {lines.map((line, index) => {
          const lineNo = index + 1
          const inConflict =
            highlightRange && lineNo >= highlightRange.start && lineNo <= highlightRange.end
          const checked = checkedLines?.has(lineNo) ?? false

          return (
            <div
              key={lineNo}
              className={`grid ${ROW_GRID} ${inConflict ? highlightClass : ''}`}
            >
              <span className="flex items-center justify-center">
                {inConflict && onLineToggle && (
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onLineToggle(lineNo)}
                    className="h-3 w-3 rounded border-gf-border-strong"
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
  )
}
