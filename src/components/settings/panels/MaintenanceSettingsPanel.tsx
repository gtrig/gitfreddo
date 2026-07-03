import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
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
      showToast(t('toast.maintenance.openRepoFirst'), 'error')
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
          ? t('toast.maintenance.removedCommits', { count: result.removedCommitCount })
          : t('toast.maintenance.cleanupComplete'),
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
  const otherObjectCount = summary ? summary.blobCount + summary.treeCount : 0

  return (
    <div className="space-y-4">
      <p className="text-xs leading-relaxed text-gf-fg-subtle">
        {t('settings.maintenance.intro')}
      </p>

      {!connected && (
        <p className="text-xs text-amber-300">{t('settings.maintenance.openRepoFirst')}</p>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="text-sm font-medium text-gf-fg">{t('settings.maintenance.unreachableCommits')}</h3>
          <p className="mt-1 text-xs text-gf-fg-muted">
            {t('settings.maintenance.unreachableDesc')}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton onClick={() => void handleScan()} loading={scanning} disabled={!connected}>
            {scanning ? t('settings.maintenance.scanning') : t('settings.maintenance.scan')}
          </ActionButton>
          <ActionButton
            variant="danger"
            disabled={!connected || totalCommits === 0}
            onClick={() => setConfirmPrune(true)}
          >
            {t('settings.maintenance.removeStale')}
          </ActionButton>
        </div>

        {summary && (
          <div className="rounded border border-gf-border-strong bg-gf-bg-deep p-3 text-xs">
            <p className="text-gf-fg-muted">
              {t('settings.maintenance.foundCommits', { count: summary.totalCommitCount })}
              {otherObjectCount > 0 && (
                <>
                  {' '}
                  {t('settings.maintenance.andObjects', { count: otherObjectCount })}
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
                {t('settings.maintenance.showingFirst', {
                  shown: summary.commits.length,
                  total: summary.totalCommitCount
                })}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3 border-t border-gf-border pt-4">
        <div>
          <h3 className="text-sm font-medium text-gf-fg">{t('settings.maintenance.staleRefs')}</h3>
          <p className="mt-1 text-xs text-gf-fg-muted">
            {t('settings.maintenance.staleRefsDesc')}
          </p>
        </div>

        <ActionButton disabled={!connected} onClick={() => setRemoveStaleOpen(true)}>
          {t('settings.maintenance.removeStaleBranches')}
        </ActionButton>
      </div>

      <ConfirmDialog
        open={confirmPrune}
        title={t('settings.maintenance.confirmPruneTitle')}
        message={t('settings.maintenance.confirmPruneMessage', { count: totalCommits })}
        confirmLabel={t('settings.maintenance.confirmPrune')}
        busy={pruning}
        onConfirm={() => void handlePrune()}
        onCancel={() => setConfirmPrune(false)}
      />

      <RemoveStaleBranchesModal open={removeStaleOpen} onClose={() => setRemoveStaleOpen(false)} />
    </div>
  )
}
