import type { SplitDiffRow } from '@/lib/unifiedDiff'
import { useTranslation } from 'react-i18next'

function formatLineNo(value: number | null): string {
  return value == null ? '' : String(value)
}

function cellClass(kind: 'add' | 'remove' | 'context' | null): string {
  switch (kind) {
    case 'add':
      return 'bg-gf-diff-add text-emerald-100'
    case 'remove':
      return 'bg-gf-diff-del text-red-200'
    case 'context':
      return 'text-gf-fg-muted'
    default:
      return 'bg-gf-bg-deep/40 text-gf-fg-subtle'
  }
}

interface SplitDiffViewProps {
  rows: SplitDiffRow[]
  loading?: boolean
  emptyMessage?: string
}

export function SplitDiffView({ rows, loading, emptyMessage }: SplitDiffViewProps) {
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

  return (
    <div className="font-mono text-[12px] leading-5">
      <div className="sticky top-0 z-10 grid grid-cols-2 border-b border-gf-border bg-gf-bg-deep/95 text-[10px] uppercase tracking-wide text-gf-fg-subtle">
        <span className="border-r border-gf-border px-4 py-1">Before</span>
        <span className="px-4 py-1">After</span>
      </div>
      {rows.map((row, index) => (
        <div key={index} className="grid grid-cols-2 border-b border-gf-border/40">
          <div
            className={`grid grid-cols-[44px_minmax(0,1fr)] border-r border-gf-border/60 ${cellClass(row.leftKind)}`}
          >
            <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
              {formatLineNo(row.leftLineNo)}
            </span>
            <code className="min-w-0 whitespace-pre-wrap break-words px-3 py-0.5">
              {row.leftText ?? ''}
            </code>
          </div>
          <div className={`grid grid-cols-[44px_minmax(0,1fr)] ${cellClass(row.rightKind)}`}>
            <span className="select-none border-r border-gf-border/60 bg-gf-diff-gutter px-2 text-right text-[11px] text-gf-fg-subtle">
              {formatLineNo(row.rightLineNo)}
            </span>
            <code className="min-w-0 whitespace-pre-wrap break-words px-3 py-0.5">
              {row.rightText ?? ''}
            </code>
          </div>
        </div>
      ))}
    </div>
  )
}
