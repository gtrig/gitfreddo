import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AiConflictResolutionProposal } from '@shared/ai'

function confidenceTone(confidence: number): string {
  if (confidence >= 80) return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  if (confidence >= 50) return 'bg-amber-500/20 text-amber-200 border-amber-500/40'
  return 'bg-red-500/20 text-red-300 border-red-500/40'
}

interface ConflictAiProposalCardProps {
  proposal: AiConflictResolutionProposal
  onAccept: () => void
  onReject: () => void
}

export function ConflictAiProposalCard({
  proposal,
  onAccept,
  onReject
}: ConflictAiProposalCardProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)

  return (
    <div className="rounded border border-violet-500/30 bg-violet-500/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${confidenceTone(proposal.confidence)}`}
        >
          {t('diff.confidence', { percent: proposal.confidence })}
        </span>
        <span className="text-[10px] text-gf-fg-subtle">{t('diff.aiProposal')}</span>
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            onClick={onAccept}
            className="rounded bg-emerald-600/80 px-2 py-0.5 text-[10px] text-white hover:bg-emerald-500"
          >
            {t('diff.accept')}
          </button>
          <button
            type="button"
            onClick={onReject}
            className="rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-surface"
          >
            {t('diff.reject')}
          </button>
          {proposal.analysis && (
            <button
              type="button"
              onClick={() => setExpanded((open) => !open)}
              className="rounded border border-gf-border-strong px-2 py-0.5 text-[10px] text-gf-fg-muted hover:bg-gf-surface"
            >
              {expanded ? t('diff.hide') : t('diff.analysis')}
            </button>
          )}
        </div>
      </div>
      {expanded && proposal.analysis && (
        <p className="mt-2 text-[11px] leading-relaxed text-gf-fg-muted">{proposal.analysis}</p>
      )}
    </div>
  )
}

export function confidenceBadgeClass(confidence: number): string {
  return confidenceTone(confidence)
}
