import type { DiffRow } from '@/lib/unifiedDiff'
import { groupRowsByHunk } from '@/lib/unifiedDiff'

function formatLineNo(value: number | null): string {
  return value == null ? '' : String(value)
}

function unifiedRowClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'bg-gf-diff-add'
    case 'remove':
      return 'bg-gf-diff-del'
    case 'hunk':
      return 'bg-gf-diff-hunk text-gf-accent-fg/90'
    case 'context':
      return 'bg-transparent'
    default:
      return 'bg-transparent text-gf-fg-subtle'
  }
}

function unifiedTextClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'text-emerald-100'
    case 'remove':
      return 'text-red-200'
    case 'hunk':
      return 'text-gf-accent-fg/90'
    case 'context':
      return 'text-gf-fg-muted'
    default:
      return 'text-gf-fg-subtle'
  }
}

function markerForKind(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return '+'
    case 'remove':
      return '−'
    case 'context':
      return ' '
    default:
      return ''
  }
}

interface UnifiedDiffViewProps {
  rows: DiffRow[]
  loading?: boolean
  emptyMessage?: string
}

export function UnifiedDiffView({ rows, loading, emptyMessage }: UnifiedDiffViewProps) {
  if (loading) {
    return <p className="px-4 py-6 text-sm text-gf-fg-subtle">Loading diff…</p>
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gf-fg-subtle">
        {emptyMessage ?? 'No diff content for this file.'}
      </p>
    )
  }

  const groups = groupRowsByHunk(rows)

  return (
    <div className="font-mono text-[12px] leading-5">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group[0]?.kind === 'hunk' && (
            <div
              className={`border-y border-gf-border/80 px-4 py-1 ${unifiedRowClass('hunk')} ${unifiedTextClass('hunk')}`}
            >
              {group[0].content}
            </div>
          )}
          {group
            .filter((row) => row.kind !== 'hunk')
            .map((row, index) => (
              <div
                key={`${groupIndex}-${index}`}
                className={`grid grid-cols-[44px_44px_20px_minmax(0,1fr)] ${unifiedRowClass(row.kind)}`}
              >
                <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
                  {formatLineNo(row.oldLine)}
                </span>
                <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
                  {formatLineNo(row.newLine)}
                </span>
                <span
                  className={`select-none border-r border-gf-border/60 px-1 text-center text-[11px] ${
                    row.kind === 'add'
                      ? 'text-emerald-400'
                      : row.kind === 'remove'
                        ? 'text-red-400'
                        : 'text-gf-fg-subtle'
                  }`}
                >
                  {markerForKind(row.kind)}
                </span>
                <code className={`min-w-0 whitespace-pre-wrap break-words px-3 ${unifiedTextClass(row.kind)}`}>
                  {row.content || ' '}
                </code>
              </div>
            ))}
        </div>
      ))}
    </div>
  )
}
