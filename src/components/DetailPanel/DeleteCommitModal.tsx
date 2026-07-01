import { useEffect, useState } from 'react'
import { ActionButton, Modal } from '@/components/ui/Modal'
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

const MODE_DESCRIPTIONS: Record<ResetMode, string> = {
  soft: 'Removes the commit but keeps all changes staged.',
  mixed: 'Removes the commit and unstages changes; files remain in your working tree.',
  hard: 'Removes the commit and discards all changes permanently.'
}

function actionTitle(action: DeleteCommitAction, count: number): string {
  switch (action) {
    case 'deleteHead':
      return 'Delete latest commit'
    case 'drop':
      return count === 1 ? 'Drop commit from history' : `Drop ${count} commits from history`
    case 'revert':
      return 'Revert commit'
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
  const { resetHead, dropCommits, revertCommit } = useGitMutations()
  const { data: working } = useWorkingStatus(open)
  const showToast = useToastStore((s) => s.show)
  const [mode, setMode] = useState<ResetMode>(initialMode)

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
        showToast(`Deleted latest commit (${mode} reset).`, 'success')
      } else if (action === 'drop') {
        await dropCommits.mutateAsync({ hashes: commits.map((c) => c.hash) })
        showToast(
          commits.length === 1 ? 'Commit dropped from history.' : `${commits.length} commits dropped from history.`,
          'success'
        )
      } else {
        await revertCommit.mutateAsync({ hash: commits[0]!.hash })
        showToast('Commit reverted.', 'success')
      }
      onClose()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    }
  }

  return (
    <Modal open={open} title={actionTitle(action, commits.length)} onClose={onClose} size="lg">
      {action === 'deleteHead' && (
        <p className="mb-4 text-sm text-gf-fg-muted">
          Remove the latest commit on the current branch by resetting to its parent.
        </p>
      )}

      {action === 'drop' && (
        <p className="mb-4 text-sm text-gf-fg-muted">
          Permanently remove {commits.length === 1 ? 'this commit' : 'these commits'} from branch
          history via interactive rebase. Later commits will be replayed without{' '}
          {commits.length === 1 ? 'it' : 'them'}.
        </p>
      )}

      {action === 'revert' && (
        <p className="mb-4 text-sm text-gf-fg-muted">
          Creates a new commit that undoes the changes from{' '}
          <span className="font-mono text-gf-fg">{commits[0]?.shortHash}</span>. Safe for shared
          branches because history is not rewritten.
        </p>
      )}

      {showRemoteWarning && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          This branch is {ahead} commit{ahead === 1 ? '' : 's'} ahead of its remote. Rewriting
          history may require a force push. Prefer Revert when the commit is already on the remote.
        </p>
      )}

      {workingTreeDirty && action !== 'revert' && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Commit or stash your uncommitted changes before rewriting history.
        </p>
      )}

      {gitBusy && (
        <p className="mb-4 rounded border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
          Finish or abort the current merge, rebase, or cherry-pick first.
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
                  {MODE_DESCRIPTIONS[option]}
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
          Cancel
        </ActionButton>
        <ActionButton
          variant={action === 'revert' ? 'primary' : 'danger'}
          loading={busy}
          disabled={rewriteBlocked}
          onClick={() => void handleConfirm()}
        >
          {action === 'deleteHead' && 'Delete commit'}
          {action === 'drop' && (commits.length === 1 ? 'Drop commit' : `Drop ${commits.length} commits`)}
          {action === 'revert' && 'Revert commit'}
        </ActionButton>
      </div>
    </Modal>
  )
}
