import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActionButton, Modal } from '@/components/Ui/Modal'
import type { GitCommit } from '@/lib/types'

export type MergeParentAction = 'revert' | 'cherry-pick' | 'cherry-pick-no-commit'

interface PickMergeParentModalProps {
  open: boolean
  commit: GitCommit
  commits: GitCommit[]
  action: MergeParentAction
  busy?: boolean
  onClose: () => void
  onConfirm: (mainline: number) => void
}

function parentLabel(commit: GitCommit | undefined, index: number): string {
  if (!commit) return `Parent ${index}`
  return `${commit.shortHash} — ${commit.subject}`
}

export function PickMergeParentModal({
  open,
  commit,
  commits,
  action,
  busy = false,
  onClose,
  onConfirm
}: PickMergeParentModalProps) {
  const { t } = useTranslation()
  const [mainline, setMainline] = useState(1)
  const commitByHash = new Map(commits.map((entry) => [entry.hash, entry]))

  const title =
    action === 'revert'
      ? t('modals.mergeParent.revertTitle')
      : t('modals.mergeParent.cherryPickTitle')

  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {t('modals.mergeParent.description', { hash: commit.shortHash })}
        </p>
        <div className="space-y-2">
          {commit.parents.map((parentHash, index) => {
            const parentNumber = index + 1
            const parentCommit = commitByHash.get(parentHash)
            return (
              <label
                key={parentHash}
                className="flex cursor-pointer items-start gap-2 rounded border border-gf-border px-3 py-2 text-sm hover:bg-gf-surface-hover"
              >
                <input
                  type="radio"
                  name="merge-parent"
                  checked={mainline === parentNumber}
                  onChange={() => setMainline(parentNumber)}
                  disabled={busy}
                />
                <span>
                  <span className="font-medium text-gf-fg">
                    {t('modals.mergeParent.parentLine', { number: parentNumber })}
                  </span>
                  <span className="mt-0.5 block text-xs text-gf-fg-muted">
                    {parentLabel(parentCommit, parentNumber)}
                  </span>
                </span>
              </label>
            )
          })}
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose} disabled={busy}>
            {t('common.cancel')}
          </ActionButton>
          <ActionButton variant="primary" loading={busy} onClick={() => onConfirm(mainline)}>
            {t('common.confirm')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
