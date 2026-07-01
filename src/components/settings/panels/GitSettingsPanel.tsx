import { useState } from 'react'
import { ActionButton, ConfirmDialog, FieldLabel, TextInput } from '@/components/ui/Modal'
import { RemoveStaleBranchesModal } from '@/components/DetailPanel/RemoveStaleBranchesModal'
import type { AppSettings } from '@/hooks/useAppSettings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import type { MaintenancePruneResult, UnreachableSummary } from '@/lib/types'

interface PanelProps {
  form: AppSettings
  onChange: (patch: Partial<AppSettings>) => void
  onPickGit: () => void
}

function formatAuthorDate(iso: string): string {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function GitSettingsPanel({ form, onChange, onPickGit }: PanelProps) {
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
      const result = (await window.gitfredo.invoke(
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
      const result = (await window.gitfredo.invoke(
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
    <div className="space-y-6">
      <div className="space-y-3">
        <div>
          <FieldLabel>git binary path</FieldLabel>
          <div className="flex gap-2">
            <TextInput
              value={form.gitBinaryPath}
              onChange={(e) => onChange({ gitBinaryPath: e.target.value })}
            />
            <ActionButton onClick={onPickGit}>Browse</ActionButton>
          </div>
        </div>
        <div>
          <FieldLabel>Default remote</FieldLabel>
          <TextInput
            value={form.defaultRemote}
            onChange={(e) => onChange({ defaultRemote: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <div>
          <h3 className="text-sm font-medium text-gf-fg">Repository maintenance</h3>
          <p className="mt-1 text-xs text-gf-fg-muted">
            Removes commits not reachable from any branch. Reflog entries are cleared first so Git
            can garbage-collect them.
          </p>
          {!connected && (
            <p className="mt-2 text-xs text-amber-300">Open a repository to scan for stale commits.</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => void handleScan()} loading={scanning} disabled={!connected}>
            {scanning ? 'Scanning…' : 'Scan for stale commits'}
          </ActionButton>
          <ActionButton disabled={!connected} onClick={() => setRemoveStaleOpen(true)}>
            Remove stale branch history…
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
