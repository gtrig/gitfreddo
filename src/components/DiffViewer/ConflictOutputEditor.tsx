import { useTranslation } from 'react-i18next'
import type { ConflictHunk } from '@/lib/conflicts/conflictMarkers'
import type { PreviewLine } from '@/lib/conflicts/conflictResolution'
import { ActionButton } from '@/components/Ui/Modal'

const ROW_GRID = 'grid-cols-[44px_minmax(0,1fr)]'

function previewLineClass(kind: PreviewLine['kind']): string {
  switch (kind) {
    case 'activeHunk':
      return 'bg-orange-500/20 text-gf-fg'
    case 'hunk':
      return 'bg-gf-surface/60 text-gf-fg-muted'
    default:
      return 'text-gf-fg-muted'
  }
}

interface ConflictOutputEditorProps {
  activeHunk: ConflictHunk | null
  resolvedText: string
  previewLines: PreviewLine[]
  editMode: 'checkbox' | 'manual'
  onResolvedTextChange: (text: string) => void
  onTakeOurs: () => void
  onTakeTheirs: () => void
  onTakeBoth: () => void
  onResetToSelection: () => void
}

export function ConflictOutputEditor({
  activeHunk,
  resolvedText,
  previewLines,
  editMode,
  onResolvedTextChange,
  onTakeOurs,
  onTakeTheirs,
  onTakeBoth,
  onResetToSelection
}: ConflictOutputEditorProps) {
  const { t } = useTranslation()

  if (!activeHunk) {
    return (
      <div className="flex items-center justify-center px-3 py-8 text-xs text-gf-fg-subtle">
        {t('diff.noConflictsInFile')}
      </div>
    )
  }

  return (
    <div className="px-3 py-2">
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <ActionButton onClick={onTakeOurs}>{t('diff.ours')}</ActionButton>
        <ActionButton onClick={onTakeTheirs}>{t('diff.theirs')}</ActionButton>
        <ActionButton onClick={onTakeBoth}>{t('diff.both')}</ActionButton>
        {editMode === 'manual' && (
          <ActionButton onClick={onResetToSelection}>{t('diff.resetToSelection')}</ActionButton>
        )}
      </div>
      <label className="mb-1 block text-[10px] uppercase text-gf-fg-subtle">
        {t('diff.resolvedTextFor', { number: activeHunk.id + 1 })}
      </label>
      <textarea
        value={resolvedText}
        onChange={(event) => onResolvedTextChange(event.target.value)}
        rows={6}
        className="mb-3 max-h-40 w-full resize-y overflow-auto rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 font-mono text-[12px] leading-5 text-gf-fg"
        spellCheck={false}
      />

      <div className="border-t border-gf-border pt-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase text-gf-fg-subtle">
          {t('diff.fullFilePreview')}
        </span>
        <div className="font-mono text-[12px] leading-5">
          {previewLines.map((line, index) => {
            const lineNo = index + 1
            return (
              <div key={lineNo} className={`grid ${ROW_GRID} ${previewLineClass(line.kind)}`}>
                <span className="select-none border-r border-gf-border/50 px-2 text-right text-gf-fg-subtle">
                  {lineNo}
                </span>
                <span className="whitespace-pre px-2">{line.text || ' '}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
