import type { DiffRow } from '@/lib/unifiedDiff'
import { groupRowsByHunk } from '@/lib/unifiedDiff'

function formatLineNo(value: number | null): string {
  return value == null ? '' : String(value)
}

function unifiedRowClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'bg-[#1b3728]/80'
    case 'remove':
      return 'bg-[#3d1f24]/80'
    case 'hunk':
      return 'bg-[#1c2d41]/60 text-sky-300/90'
    case 'context':
      return 'bg-transparent'
    default:
      return 'bg-transparent text-zinc-500'
  }
}

function unifiedTextClass(kind: DiffRow['kind']): string {
  switch (kind) {
    case 'add':
      return 'text-emerald-100'
    case 'remove':
      return 'text-red-200'
    case 'hunk':
      return 'text-sky-300/90'
    case 'context':
      return 'text-zinc-300'
    default:
      return 'text-zinc-500'
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
    return <p className="px-4 py-6 text-sm text-zinc-500">Loading diff…</p>
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-zinc-500">
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
              className={`border-y border-zinc-800/80 px-4 py-1 ${unifiedRowClass('hunk')} ${unifiedTextClass('hunk')}`}
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
                <span className="select-none border-r border-zinc-800/60 bg-[#161b22] px-2 text-right text-[11px] text-zinc-600">
                  {formatLineNo(row.oldLine)}
                </span>
                <span className="select-none border-r border-zinc-800/60 bg-[#161b22] px-2 text-right text-[11px] text-zinc-600">
                  {formatLineNo(row.newLine)}
                </span>
                <span
                  className={`select-none border-r border-zinc-800/60 px-1 text-center text-[11px] ${
                    row.kind === 'add'
                      ? 'text-emerald-400'
                      : row.kind === 'remove'
                        ? 'text-red-400'
                        : 'text-zinc-700'
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
