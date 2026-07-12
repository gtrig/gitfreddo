import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'
import { Spinner } from '@/components/Ui/Spinner'
import { SidebarIconChevron } from '@/components/Layout/sidebar/SidebarIcons'
import type { GitMergeStatus } from '@/lib/types'

const SUBJECT_MAX = 72

function Chevron({ open }: { open: boolean }) {
  return <SidebarIconChevron open={open} className="h-3 w-3 shrink-0 text-gf-fg-subtle" />
}

function buildCommitMessage(summary: string, description: string): string {
  const subject = summary.trim()
  const body = description.trim()
  if (!body) return subject
  return `${subject}\n\n${body}`
}

function parseCommitMessage(text: string): { summary: string; description: string } {
  const trimmed = text.trim()
  const split = trimmed.split(/\n\n/)
  const summary = split[0]?.trim() ?? ''
  const description = split.slice(1).join('\n\n').trim()
  return { summary, description }
}

function continueLabel(
  kind: GitMergeStatus['kind'],
  t: (key: string) => string
): string {
  switch (kind) {
    case 'rebase':
      return t('conflicts.continueRebase')
    case 'cherry-pick':
      return t('conflicts.continueCherryPick')
    default:
      return t('conflicts.completeMerge')
  }
}

function abortLabel(kind: GitMergeStatus['kind'], t: (key: string) => string): string {
  switch (kind) {
    case 'rebase':
      return t('conflicts.abortRebase')
    case 'cherry-pick':
      return t('conflicts.abortCherryPick')
    default:
      return t('conflicts.abortMerge')
  }
}

interface MergeCommitFooterProps {
  mergeStatus: GitMergeStatus
  conflictedCount: number
}

export function MergeCommitFooter({ mergeStatus, conflictedCount }: MergeCommitFooterProps) {
  const { t } = useTranslation()
  const {
    mergeContinue,
    mergeAbort,
    rebaseContinue,
    rebaseAbort,
    rebaseSkip,
    cherryPickContinue,
    cherryPickAbort,
    cherryPickSkip
  } = useGitMutations()
  const showToast = useToastStore((s) => s.show)

  const [expanded, setExpanded] = useState(true)
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')

  const kind = mergeStatus.kind
  const canContinue = conflictedCount === 0

  const busy =
    mergeContinue.isPending ||
    mergeAbort.isPending ||
    rebaseContinue.isPending ||
    rebaseAbort.isPending ||
    rebaseSkip.isPending ||
    cherryPickContinue.isPending ||
    cherryPickAbort.isPending ||
    cherryPickSkip.isPending

  async function handleContinue() {
    if (!canContinue || !kind) return
    const message = buildCommitMessage(summary, description)
    if (kind === 'merge' && !message.trim()) {
      showToast(t('conflicts.enterCommitSummary'), 'error')
      return
    }
    try {
      if (kind === 'merge') {
        await mergeContinue.mutateAsync({ message })
      } else if (kind === 'rebase') {
        await rebaseContinue.mutateAsync(message.trim() ? { message } : undefined)
      } else {
        await cherryPickContinue.mutateAsync(message.trim() ? { message } : undefined)
      }
      showToast(t('conflicts.operationContinued'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  async function handleAbort() {
    if (!kind) return
    try {
      if (kind === 'merge') {
        await mergeAbort.mutateAsync({})
      } else if (kind === 'rebase') {
        await rebaseAbort.mutateAsync({})
      } else {
        await cherryPickAbort.mutateAsync({})
      }
      showToast(t('conflicts.operationAborted'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  async function handleSkip() {
    if (!kind) return
    try {
      if (kind === 'rebase') {
        await rebaseSkip.mutateAsync({})
      } else if (kind === 'cherry-pick') {
        await cherryPickSkip.mutateAsync({})
      }
      showToast(t('conflicts.skipped'), 'success')
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  useEffect(() => {
    if (mergeStatus.mergeMessage) {
      const parsed = parseCommitMessage(mergeStatus.mergeMessage)
      setSummary(parsed.summary)
      setDescription(parsed.description)
      return
    }
    if (mergeStatus.kind === 'merge') {
      const incoming = mergeStatus.incomingLabel ?? 'branch'
      setSummary(t('conflicts.mergeBranchSubject', { branch: incoming }))
    }
  }, [mergeStatus.kind, mergeStatus.incomingLabel, mergeStatus.mergeMessage, t])

  const subjectRemaining = SUBJECT_MAX - summary.length

  return (
    <div className="shrink-0 border-t border-gf-border bg-gf-bg-deep">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center gap-2 border-b border-gf-border px-3 py-2 text-left text-xs font-medium text-gf-fg-muted hover:bg-gf-surface/50"
      >
        <Chevron open={expanded} />
        <span>{t('workingTree.commit')}</span>
      </button>

      {expanded && (
        <div className="space-y-2 px-3 py-3">
          <div>
            <label className="mb-1 block text-[10px] uppercase text-gf-fg-subtle">
              {t('conflicts.commitSummary')}
              <span className="float-right font-mono text-gf-fg-subtle">{subjectRemaining}</span>
            </label>
            <input
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-xs text-gf-fg"
              placeholder={t('conflicts.mergeCommitSubject')}
            />
          </div>
          <div>
            <label
              htmlFor="merge-commit-description"
              className="mb-1 block text-[10px] uppercase text-gf-fg-subtle"
            >
              {t('conflicts.description')}
            </label>
            <textarea
              id="merge-commit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-y rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 text-xs text-gf-fg"
            />
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              disabled={!canContinue || busy}
              onClick={() => void handleContinue()}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
            >
              {(mergeContinue.isPending ||
                rebaseContinue.isPending ||
                cherryPickContinue.isPending) && (
                <Spinner size="sm" className="border-white/30 border-t-white" />
              )}
              {canContinue ? continueLabel(kind, t) : t('conflicts.resolveConflictsToContinue')}
            </button>
            {kind !== 'merge' && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleSkip()}
                className="rounded border border-gf-border-strong px-3 py-1.5 text-xs text-gf-fg-muted hover:bg-gf-surface disabled:opacity-50"
              >
                {t('conflicts.skip')}
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleAbort()}
              className="rounded border border-red-500/50 bg-red-500/10 px-3 py-1.5 text-xs text-red-300 hover:bg-red-500/20 disabled:opacity-50"
            >
              {abortLabel(kind, t)}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
