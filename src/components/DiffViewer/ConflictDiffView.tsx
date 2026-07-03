import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { ConflictHunk } from '@/lib/conflictMarkers'
import { ActionButton } from '@/components/ui/Modal'

interface ConflictDiffViewProps {
  hunks: ConflictHunk[]
  onChange: (hunkId: number, resolved: string) => void
}

export function ConflictDiffView({ hunks, onChange }: ConflictDiffViewProps) {
  return (
    <div className="space-y-4 font-mono text-[12px]">
      {hunks.map((hunk) => (
        <ConflictHunkBlock key={hunk.id} hunk={hunk} onChange={onChange} />
      ))}
    </div>
  )
}

function ConflictHunkBlock({
  hunk,
  onChange
}: {
  hunk: ConflictHunk
  onChange: (hunkId: number, resolved: string) => void
}) {
  const { t } = useTranslation()
  const [edited, setEdited] = useState(hunk.resolved)

  return (
    <div className="rounded border border-orange-500/30 bg-gf-bg">
      <div className="flex flex-wrap gap-1 border-b border-gf-border px-3 py-2">
        <ActionButton onClick={() => onChange(hunk.id, hunk.ours)}>{t('diff.ours')}</ActionButton>
        <ActionButton onClick={() => onChange(hunk.id, hunk.theirs)}>{t('diff.theirs')}</ActionButton>
        <ActionButton
          onClick={() => {
            const both = [hunk.ours, hunk.theirs].filter(Boolean).join('\n')
            setEdited(both)
            onChange(hunk.id, both)
          }}
        >
          {t('diff.both')}
        </ActionButton>
      </div>
      <div className="grid grid-cols-2 gap-px bg-gf-border">
        <div className="bg-gf-diff-del/20 p-3">
          <p className="mb-1 text-[10px] uppercase text-red-300">{hunk.oursLabel}</p>
          <pre className="whitespace-pre-wrap text-red-100">{hunk.ours || t('diff.empty')}</pre>
        </div>
        <div className="bg-gf-diff-add/20 p-3">
          <p className="mb-1 text-[10px] uppercase text-emerald-300">{hunk.theirsLabel}</p>
          <pre className="whitespace-pre-wrap text-emerald-100">{hunk.theirs || t('diff.empty')}</pre>
        </div>
      </div>
      <div className="border-t border-gf-border p-3">
        <p className="mb-1 text-[10px] uppercase text-gf-fg-subtle">{t('diff.resolved')}</p>
        <textarea
          value={edited}
          onChange={(e) => {
            setEdited(e.target.value)
            onChange(hunk.id, e.target.value)
          }}
          rows={Math.max(3, edited.split('\n').length)}
          className="w-full resize-y rounded border border-gf-border-strong bg-gf-bg px-2 py-1 text-gf-fg"
        />
      </div>
    </div>
  )
}
