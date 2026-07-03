import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkingStatus } from '@/hooks/useGit'
import { useToastStore } from '@/stores/toast'
import type { GitCommit } from '@/lib/types'

export type DeleteCommitAction = 'deleteHead' | 'drop' | 'revert'

export type ResetMode = 'soft' | 'mixed' | 'hard'

interface DeleteCommitModalProps {
  action: DeleteCommitAction
  commits: GitCommit[]
  ahead: number
  open: boolean
  onClose: () => void
  initialMode?: ResetMode
}

function actionTitle(
  action: DeleteCommitAction,
  count: number,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  switch (action) {
    case 'deleteHead':
      return t('detail.deleteLatestCommit')
    case 'drop':
      return count === 1
        ? t('detail.dropCommitFromHistory')
        : t('detail.dropCommitsFromHistory', { count })
    case 'revert':
      return t('detail.revertCommit')
  }
}

export function DeleteCommitModal({
  action,
  commits,
  ahead,
  open,
  onClose,
  initialMode = 'mixed'
}: DeleteCommitModalProps) {
  const { t } = useTranslation()
  const { resetHead, dropCommits, revertCommit } = useGitMutations()
  const { data: working } = useWorkingStatus(open)
  const showToast = useToastStore((s) => s.show)
  const [mode, setMode] = useState<ResetMode>(initialMode)

  const modeDescriptions: Record<ResetMode, string> = {
    soft: t('detail.resetSoftDescription'),
    mixed: t('detail.resetMixedDescription'),
    hard: t('detail.resetHardDescription')
  }

  useEffect(() => {
    if (open) setMode(initialMode)
  }, [open, initialMode])

  const busy = resetHead.isPending || dropCommits.isPending || revertCommit.isPending
  const showRemoteWarning = ahead > 0 && action !== 'revert'
  const workingTreeDirty = working ? !working.isClean : false
  const gitBusy = Boolean(
    working?.rebaseInProgress || working?.mergeInProgress || working?.cherryPickInProgress
  )
  const rewriteBlocked =
    action === 'revert'
      ? gitBusy
      : action === 'deleteHead'
        ? gitBusy || (mode === 'hard' && workingTreeDirty)
        : gitBusy || workingTreeDirty

  async function handleConfirm() {
    try {
      if (action === 'deleteHead') {
        await resetHead.mutateAsync({ mode })
        showToast(t('detail.deletedLatestCommit', { mode }), 'success')
      } else if (action === 'drop') {
        await dropCommits.mutateAsync({ hashes: commits.map((c) => c.hash) })
        showToast(
          commits.length === 1
            ? t('detail.commitDropped')
            : t('detail.commitsDropped', { count: commits.length }),
          'success'
        )
      } else {
        await revertCommit.mutateAsync({ hash: commits[0]!.hash })
        showToast(t('detail.commitReverted'), 'success')
      }
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title={actionTitle(action, commits.length, t)} onClose={onClose} size="lg">
      {action === 'deleteHead' && (
        <p className="mb-4 text-sm text-gf-fg-muted">{t('detail.deleteHeadDescription')}</p>
      )}

      {action === 'drop' && (
        <p className="mb-4 text-sm text-gf-fg-muted">
          {commits.length === 1 ? t('detail.dropDescriptionOne') : t('detail.dropDescriptionMany')}
        </p>
      )}

      {action === 'revert' && (
        <p className="mb-4 text-sm text-gf-fg-muted">
          {t('detail.revertDescription', { hash: commits[0]?.shortHash })}
        </p>
      )}

      {showRemoteWarning && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {t('detail.remoteWarning', { count: ahead })}
        </p>
      )}

      {workingTreeDirty && action !== 'revert' && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {t('detail.commitOrStashBeforeRewrite')}
        </p>
      )}

      {gitBusy && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          {t('detail.finishOrAbortGitOp')}
        </p>
      )}

      {action === 'deleteHead' && (
        <div className="mb-4 space-y-2">
          {(['soft', 'mixed', 'hard'] as const).map((option) => (
            <label
              key={option}
              className={`flex cursor-pointer gap-3 rounded border px-3 py-2 text-sm ${
                mode === option
                  ? 'border-gf-accent bg-gf-accent/10'
                  : 'border-gf-border-strong hover:bg-gf-surface-hover'
              }`}
            >
              <input
                type="radio"
                name="reset-mode"
                value={option}
                checked={mode === option}
                onChange={() => setMode(option)}
                disabled={busy}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium capitalize text-gf-fg">{option}</span>
                <span className="mt-0.5 block text-xs text-gf-fg-muted">
                  {modeDescriptions[option]}
                </span>
              </span>
            </label>
          ))}
        </div>
      )}

      {(action === 'drop' || action === 'revert') && commits.length > 0 && (
        <ul className="mb-4 max-h-40 space-y-1 overflow-y-auto rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm">
          {commits.map((commit) => (
            <li key={commit.hash} className="flex gap-2 truncate">
              <span className="shrink-0 font-mono text-gf-fg-subtle">{commit.shortHash}</span>
              <span className="truncate text-gf-fg">{commit.subject}</span>
            </li>
          ))}
        </ul>
      )}

      {action === 'deleteHead' && commits[0] && (
        <ul className="mb-4 rounded border border-gf-border-strong bg-gf-bg-deep px-3 py-2 text-sm">
          <li className="flex gap-2 truncate">
            <span className="shrink-0 font-mono text-gf-fg-subtle">{commits[0].shortHash}</span>
            <span className="truncate text-gf-fg">{commits[0].subject}</span>
          </li>
        </ul>
      )}

      <div className="flex justify-end gap-2">
        <ActionButton onClick={onClose} disabled={busy}>
          {t('common.cancel')}
        </ActionButton>
        <ActionButton
          variant={action === 'revert' ? 'primary' : 'danger'}
          loading={busy}
          disabled={rewriteBlocked}
          onClick={() => void handleConfirm()}
        >
          {action === 'deleteHead' && t('detail.deleteCommit')}
          {action === 'drop' &&
            (commits.length === 1
              ? t('detail.dropCommit')
              : t('detail.dropCommits', { count: commits.length }))}
          {action === 'revert' && t('detail.revertCommit')}
        </ActionButton>
      </div>
    </Modal>
  )
}
