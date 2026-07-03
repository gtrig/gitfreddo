import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton, FieldLabel, TextInput } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface StashBranchModalProps {
  open: boolean
  stashIndex: number
  onClose: () => void
}

export function StashBranchModal({ open, stashIndex, onClose }: StashBranchModalProps) {
  const { t } = useTranslation()
  const { stashBranch } = useGitMutations()
  const [branchName, setBranchName] = useState('')

  useEffect(() => {
    if (open) setBranchName('')
  }, [open, stashIndex])

  const trimmed = branchName.trim()

  function handleClose() {
    setBranchName('')
    onClose()
  }

  return (
    <Modal open={open} title={t('modals.stashBranch.title')} onClose={handleClose}>
      <div className="space-y-3">
        <p className="text-xs text-gf-fg-subtle">
          {t('modals.stashBranch.description')}{' '}
          <span className="font-mono text-gf-fg-muted">stash@{'{'}{stashIndex}{'}'}</span>
        </p>
        <div>
          <FieldLabel>{t('modals.stashBranch.branchName')}</FieldLabel>
          <TextInput
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
            placeholder="feature/from-stash"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            variant="primary"
            loading={stashBranch.isPending}
            disabled={!trimmed}
            onClick={async () => {
              if (!trimmed) return
              await stashBranch.mutateAsync({ index: stashIndex, branchName: trimmed })
              handleClose()
            }}
          >
            {t('modals.stashBranch.createBranch')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
