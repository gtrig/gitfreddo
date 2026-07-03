import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import type { GitMergeStartResult } from '@/lib/types'

interface MergeBranchDialogProps {
  sourceBranch: string
  onClose: () => void
}

export function MergeBranchDialog({ sourceBranch, onClose }: MergeBranchDialogProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches } = useBranches(connected)
  const current = branches?.find((b) => b.isCurrent)
  const { merge } = useGitMutations()
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const showToast = useToastStore((s) => s.show)
  const [error, setError] = useState<string | null>(null)
  const [noFf, setNoFf] = useState(false)
  const [squash, setSquash] = useState(false)

  return (
    <Modal open title={t('modals.mergeBranch.title', { branch: sourceBranch })} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {t('modals.mergeBranch.description', {
            source: sourceBranch,
            target: current?.name ?? t('modals.mergeBranch.currentBranch')
          })}
        </p>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input type="checkbox" checked={noFf} onChange={(e) => setNoFf(e.target.checked)} />
          {t('modals.mergeBranch.noFf')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <input
            type="checkbox"
            checked={squash}
            onChange={(e) => setSquash(e.target.checked)}
          />
          {t('modals.mergeBranch.squash')}
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={merge.isPending}
            onClick={async () => {
              try {
                const result = (await merge.mutateAsync({
                  branch: sourceBranch,
                  noFf,
                  squash
                })) as GitMergeStartResult
                onClose()
                if (result.status === 'conflicts') {
                  const count = result.conflictedPaths.length
                  showToast(
                    count === 1
                      ? t('modals.mergeBranch.conflictsOne', {
                          file: result.conflictedPaths[0]
                        })
                      : t('modals.mergeBranch.conflictsMany', { count }),
                    'info'
                  )
                  selectTimelineNode('merge', 'conflicts')
                  return
                }
                showToast(t('modals.mergeBranch.completed'), 'success')
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              }
            }}
          >
            {t('common.merge')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
