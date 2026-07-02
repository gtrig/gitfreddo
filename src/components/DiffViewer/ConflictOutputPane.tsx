import type { OutputLine, OutputLineSource } from '@/lib/threeWayMerge'

const ROW_GRID = 'grid-cols-[28px_44px_minmax(0,1fr)]'

function sourceRowClass(source: OutputLineSource): string {
  switch (source) {
    case 'ours':
      return 'bg-sky-500/25 text-sky-100'
    case 'theirs':
      return 'bg-amber-500/25 text-amber-100'
    default:
      return 'text-gf-fg-muted'
  }
}

interface ConflictOutputPaneProps {
  lines: OutputLine[]
}

export function ConflictOutputPane({ lines }: ConflictOutputPaneProps) {
  return (
    <div className="min-h-0 flex-1 overflow-auto font-mono text-[12px] leading-5">
      {lines.map((line, index) => {
        const lineNo = index + 1
        return (
          <div key={lineNo} className={`grid ${ROW_GRID} ${sourceRowClass(line.source)}`}>
            <span />
            <span className="select-none border-r border-gf-border/50 px-2 text-right text-gf-fg-subtle">
              {lineNo}
            </span>
            <span className="whitespace-pre px-2">{line.text || ' '}</span>
          </div>
        )
      })}
    </div>
  )
}
