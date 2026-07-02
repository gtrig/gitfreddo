import { useState } from 'react'
import { ActionButton, ConfirmDialog } from '@/components/ui/Modal'
import { RemoveStaleBranchesModal } from '@/components/DetailPanel/RemoveStaleBranchesModal'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { MaintenancePruneResult, UnreachableSummary } from '@/lib/types'

function formatAuthorDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function MaintenanceSettingsPanel() {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const connected = useWorkspaceStore((s) => s.connected)
  const showToast = useToastStore((s) => s.show)

  const [scanning, setScanning] = useState(false)
  const [pruning, setPruning] = useState(false)
  const [confirmPrune, setConfirmPrune] = useState(false)
  const [summary, setSummary] = useState<UnreachableSummary | null>(null)
  const [removeStaleOpen, setRemoveStaleOpen] = useState(false)

  async function handleScan() {
    if (!repoPath) {
      showToast('Open a repository first.', 'error')
      return
    }

    setScanning(true)
    try {
      const result = (await window.gitfreddo.invoke(
        'maintenance.unreachable',
        undefined,
        repoPath
      )) as UnreachableSummary
      setSummary(result)
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setScanning(false)
    }
  }

  async function handlePrune() {
    if (!repoPath) return

    setPruning(true)
    try {
      const result = (await window.gitfreddo.invoke(
        'maintenance.prune',
        undefined,
        repoPath
      )) as MaintenancePruneResult
      showToast(
        result.removedCommitCount > 0
          ? `Removed ${result.removedCommitCount} stale commit${result.removedCommitCount === 1 ? '' : 's'}.`
          : 'Repository cleanup complete.',
        'success'
      )
      setConfirmPrune(false)
      await handleScan()
    } catch (error) {
      showToast(error instanceof Error ? error.message : String(error), 'error')
    } finally {
      setPruning(false)
    }
  }

  const totalCommits = summary?.totalCommitCount ?? 0
  const previewTruncated = summary ? summary.totalCommitCount > summary.commits.length : false

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        Clean up unreachable objects and references that keep old commits alive in the active
        repository. These operations modify git history and cannot be undone.
      </p>

      {!connected && (
        <p className="text-xs text-amber-300">Open a repository to run maintenance actions.</p>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gf-fg">Unreachable commits</h3>
          <p className="mt-1 text-xs text-gf-fg-muted">
            Finds commits not reachable from any branch. Pruning expires reflog entries and runs
            garbage collection so Git can delete them.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => void handleScan()} loading={scanning} disabled={!connected}>
            {scanning ? 'Scanning…' : 'Scan for stale commits'}
          </ActionButton>
          <ActionButton
            variant="danger"
            disabled={!connected || totalCommits === 0}
            onClick={() => setConfirmPrune(true)}
          >
            Remove stale commits permanently
          </ActionButton>
        </div>

        {summary && (
          <div className="rounded border border-gf-border-strong bg-gf-bg-deep p-3 text-xs">
            <p className="text-gf-fg-muted">
              Found{' '}
              <span className="font-medium text-gf-fg">{summary.totalCommitCount}</span> unreachable
              commit{summary.totalCommitCount === 1 ? '' : 's'}
              {summary.blobCount + summary.treeCount > 0 && (
                <>
                  {' '}
                  and {summary.blobCount + summary.treeCount} other unreachable object
                  {summary.blobCount + summary.treeCount === 1 ? '' : 's'}
                </>
              )}
              .
            </p>

            {summary.commits.length > 0 && (
              <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                {summary.commits.map((commit) => (
                  <li key={commit.hash} className="flex gap-2 truncate">
                    <span className="shrink-0 font-mono text-gf-fg-subtle">{commit.shortHash}</span>
                    <span className="truncate text-gf-fg">{commit.subject}</span>
                    {commit.authorDate && (
                      <span className="shrink-0 text-gf-fg-subtle">
                        {formatAuthorDate(commit.authorDate)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {previewTruncated && (
              <p className="mt-2 text-gf-fg-subtle">
                Showing first {summary.commits.length} of {summary.totalCommitCount} commits.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <div>
          <h3 className="text-sm font-medium text-gf-fg">Stale references</h3>
          <p className="mt-1 text-xs text-gf-fg-muted">
            Commits not on your current branch may still be kept alive by branches, tags, backup
            refs, or remote-tracking branches. Remove those references to allow garbage collection.
          </p>
        </div>

        <ActionButton disabled={!connected} onClick={() => setRemoveStaleOpen(true)}>
          Remove stale branch history…
        </ActionButton>
      </div>

      <ConfirmDialog
        open={confirmPrune}
        title="Remove stale commits permanently?"
        message={`This will expire all reflog entries and run garbage collection on the active repository. Up to ${totalCommits} unreachable commit${totalCommits === 1 ? '' : 's'} may be permanently deleted. This cannot be undone.`}
        confirmLabel="Remove permanently"
        busy={pruning}
        onConfirm={() => void handlePrune()}
        onCancel={() => setConfirmPrune(false)}
      />

      <RemoveStaleBranchesModal open={removeStaleOpen} onClose={() => setRemoveStaleOpen(false)} />
    </div>
  )
}
