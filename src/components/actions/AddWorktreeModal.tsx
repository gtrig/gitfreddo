import { useEffect, useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useBranches, useRepoStatus } from '@/hooks/useGit'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { suggestWorktreePath } from '@/lib/worktreePaths'

export interface AddWorktreeModalProps {
  open: boolean
  onClose: () => void
  /** Pre-select an existing branch (from context menu). */
  initialBranch?: string
  /** Check out this commit when creating a new branch or detached worktree. */
  initialCommit?: string
  initialCommitShort?: string
}

export function AddWorktreeModal({
  open,
  onClose,
  initialBranch,
  initialCommit,
  initialCommitShort
}: AddWorktreeModalProps) {
  const { data: repoStatus } = useRepoStatus(open)
  const { data: branches } = useBranches(open)
  const { worktreeAdd } = useGitMutations()
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const showToast = useToastStore((s) => s.show)

  const localBranches = (branches ?? []).filter((b) => !b.isRemote)

  const [path, setPath] = useState('')
  const [mode, setMode] = useState<'existing' | 'new'>('existing')
  const [selectedBranch, setSelectedBranch] = useState('')
  const [newBranch, setNewBranch] = useState('')
  const [detach, setDetach] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    if (!open) return
    const locals = (branches ?? []).filter((b) => !b.isRemote)
    const branch = initialBranch ?? locals.find((b) => !b.isCurrent)?.name ?? ''
    const commitLabel = initialCommitShort ?? initialCommit?.slice(0, 7) ?? ''
    setSelectedBranch(branch)
    setNewBranch(branch || (commitLabel ? `worktree-${commitLabel}` : ''))
    setMode(initialCommit && !initialBranch ? 'new' : 'existing')
    setDetach(false)
    setShowAdvanced(false)
    if (repoStatus?.root && branch) {
      setPath(suggestWorktreePath(repoStatus.root, branch))
    } else if (repoStatus?.root && commitLabel) {
      setPath(suggestWorktreePath(repoStatus.root, `worktree-${commitLabel}`))
    } else if (repoStatus?.root) {
      setPath(suggestWorktreePath(repoStatus.root, 'worktree'))
    } else {
      setPath('')
    }
  }, [open, initialBranch, initialCommit, initialCommitShort, repoStatus?.root, branches])

  useEffect(() => {
    if (!open || !repoStatus?.root) return
    const name = mode === 'new' ? newBranch.trim() : selectedBranch
    if (name) {
      setPath(suggestWorktreePath(repoStatus.root, name))
    }
  }, [open, mode, selectedBranch, newBranch, repoStatus?.root])

  const handleClose = () => {
    onClose()
  }

  const canSubmit =
    path.trim().length > 0 &&
    (detach
      ? mode === 'existing'
        ? selectedBranch.length > 0 || Boolean(initialCommit)
        : mode === 'new'
          ? newBranch.trim().length > 0 || Boolean(initialCommit)
          : Boolean(initialCommit)
      : mode === 'new'
        ? newBranch.trim().length > 0
        : selectedBranch.length > 0)

  const commitLabel = initialCommitShort ?? initialCommit?.slice(0, 7)

  return (
    <Modal open={open} title="Add worktree" onClose={handleClose}>
      <div className="space-y-3 p-4">
        {initialCommit && (
          <p className="text-sm text-gf-fg-muted">
            From commit <span className="font-mono text-gf-fg">{commitLabel}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Path</span>
          <div className="mt-1 flex gap-2">
            <input
              value={path}
              onChange={(e) => setPath(e.target.value)}
              className="min-w-0 flex-1 rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5 font-mono text-xs"
              placeholder="/path/to/worktree"
            />
            <ActionButton
              onClick={async () => {
                const picked = await window.gitfreddo.pickDirectory(path || repoStatus?.root || undefined)
                if (picked) setPath(picked)
              }}
            >
              Browse…
            </ActionButton>
          </div>
        </label>

        <fieldset className="space-y-2 text-sm">
          <legend className="text-gf-fg-muted">Branch</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="worktree-mode"
              checked={mode === 'existing'}
              onChange={() => setMode('existing')}
            />
            <span>Existing branch</span>
          </label>
          {mode === 'existing' && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="ml-6 w-[calc(100%-1.5rem)] rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            >
              <option value="">Select branch…</option>
              {localBranches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                  {branch.isCurrent ? ' (current)' : ''}
                </option>
              ))}
            </select>
          )}
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="worktree-mode"
              checked={mode === 'new'}
              onChange={() => setMode('new')}
            />
            <span>New branch</span>
          </label>
          {mode === 'new' && (
            <input
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              className="ml-6 w-[calc(100%-1.5rem)] rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
              placeholder="feature/my-branch"
            />
          )}
        </fieldset>

        <button
          type="button"
          className="text-xs text-gf-fg-subtle hover:text-gf-fg"
          onClick={() => setShowAdvanced((v) => !v)}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>
        {showAdvanced && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={detach}
              onChange={(e) => setDetach(e.target.checked)}
            />
            <span className="text-gf-fg-muted">Detached HEAD</span>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            loading={worktreeAdd.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              try {
                const trimmedPath = path.trim()
                let payload: {
                  path: string
                  branch?: string
                  newBranch?: string
                  detach?: boolean
                  commit?: string
                }

                if (mode === 'existing') {
                  if (selectedBranch) {
                    payload = { path: trimmedPath, branch: selectedBranch, detach }
                  } else if (detach && initialCommit) {
                    payload = { path: trimmedPath, detach: true, commit: initialCommit }
                  } else {
                    return
                  }
                } else {
                  const branchName = newBranch.trim()
                  if (detach && initialCommit && !branchName) {
                    payload = { path: trimmedPath, detach: true, commit: initialCommit }
                  } else if (branchName) {
                    payload = {
                      path: trimmedPath,
                      newBranch: branchName,
                      detach,
                      ...(initialCommit ? { commit: initialCommit } : {})
                    }
                  } else {
                    return
                  }
                }

                const result = (await worktreeAdd.mutateAsync(payload)) as string
                const worktreePath = result || trimmedPath
                await openWorkspace(worktreePath)
                showToast('Worktree created', 'success')
                handleClose()
              } catch (error) {
                const message = error instanceof Error ? error.message : String(error)
                showToast(message || 'Failed to add worktree', 'error')
              }
            }}
          >
            Add worktree
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
