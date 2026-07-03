import type { DiffRow } from '@/lib/diff/unifiedDiff'
import { useTranslation } from 'react-i18next'
import { groupRowsByHunk } from '@/lib/diff/unifiedDiff'
import type { GitBlameLine } from '@/lib/types'

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
  showBlame?: boolean
  blameByNewLine?: Map<number, GitBlameLine>
  hunkStageMode?: 'stage' | 'unstage' | null
  onHunkAction?: (groupIndex: number) => void
  hunkBusy?: boolean
}

export function UnifiedDiffView({
  rows,
  loading,
  emptyMessage,
  showBlame = false,
  blameByNewLine,
  hunkStageMode = null,
  onHunkAction,
  hunkBusy = false
}: UnifiedDiffViewProps) {
  const { t } = useTranslation()

  if (loading) {
    return <p className="px-4 py-6 text-sm text-gf-fg-subtle">{t('diff.loadingDiff')}</p>
  }

  if (rows.length === 0) {
    return (
      <p className="px-4 py-6 text-sm text-gf-fg-subtle">
        {emptyMessage ?? t('diff.noDiffContent')}
      </p>
    )
  }

  const groups = groupRowsByHunk(rows)
  const gridCols = showBlame
    ? 'grid-cols-[72px_44px_44px_20px_minmax(0,1fr)]'
    : 'grid-cols-[44px_44px_20px_minmax(0,1fr)]'

  return (
    <div className="font-mono text-[12px] leading-5">
      {groups.map((group, groupIndex) => (
        <div key={groupIndex}>
          {group[0]?.kind === 'hunk' && (
            <div
              className={`flex items-center justify-between gap-2 border-y border-gf-border/80 px-4 py-1 ${unifiedRowClass('hunk')} ${unifiedTextClass('hunk')}`}
            >
              <span className="min-w-0 truncate">{group[0].content}</span>
              {hunkStageMode && onHunkAction && (
                <button
                  type="button"
                  disabled={hunkBusy}
                  onClick={() => onHunkAction(groupIndex)}
                  className="shrink-0 rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-bg disabled:opacity-50"
                >
                  {hunkStageMode === 'stage' ? t('diff.stageHunk') : t('diff.unstageHunk')}
                </button>
              )}
            </div>
          )}
          {group
            .filter((row) => row.kind !== 'hunk')
            .map((row, index) => {
              const blame =
                showBlame && row.newLine != null
                  ? blameByNewLine?.get(row.newLine)
                  : undefined
              return (
                <div
                  key={`${groupIndex}-${index}`}
                  className={`grid ${gridCols} ${unifiedRowClass(row.kind)}`}
                  title={blame ? `${blame.shortHash} ${blame.summary}` : undefined}
                >
                  {showBlame && (
                    <span className="select-none truncate border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-[10px] text-gf-fg-subtle">
                      {blame ? `${blame.shortHash} ${blame.author.split(' ')[0] ?? ''}` : ''}
                    </span>
                  )}
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
              )
            })}
        </div>
      ))}
    </div>
  )
}
