import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, Checkbox } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import type { GitMergeStartResult } from '@/lib/types'

interface MergeBranchDialogProps {
  sourceBranch: string
  targetBranch?: string
  onClose: () => void
}

export function MergeBranchDialog({ sourceBranch, targetBranch, onClose }: MergeBranchDialogProps) {
  const { t } = useTranslation()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches } = useBranches(connected)
  const current = branches?.find((b) => b.isCurrent)
  const { merge, mergeInto } = useGitMutations()
  const selectTimelineNode = useSelectionStore((s) => s.selectTimelineNode)
  const showToast = useToastStore((s) => s.show)
  const [error, setError] = useState<string | null>(null)
  const [noFf, setNoFf] = useState(false)
  const [squash, setSquash] = useState(false)

  const effectiveTarget = targetBranch ?? current?.name
  // The reverse direction merges the current branch into another branch, which git
  // can only do after checking that branch out — routed through the mergeInto op.
  const mergesIntoOtherBranch = Boolean(targetBranch && targetBranch !== current?.name)
  const pending = mergesIntoOtherBranch ? Boolean(mergeInto?.isPending) : merge.isPending

  return (
    <Modal open title={t('modals.mergeBranch.title', { branch: sourceBranch })} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {t('modals.mergeBranch.description', {
            source: sourceBranch,
            target: effectiveTarget ?? t('modals.mergeBranch.currentBranch')
          })}
        </p>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <Checkbox checked={noFf} onChange={(e) => setNoFf(e.target.checked)} />
          {t('modals.mergeBranch.noFf')}
        </label>
        <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
          <Checkbox checked={squash} onChange={(e) => setSquash(e.target.checked)} />
          {t('modals.mergeBranch.squash')}
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={pending}
            onClick={async () => {
              try {
                const result = (mergesIntoOtherBranch
                  ? await mergeInto.mutateAsync({
                      sourceBranch,
                      targetBranch: targetBranch!,
                      noFf,
                      squash
                    })
                  : await merge.mutateAsync({
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
