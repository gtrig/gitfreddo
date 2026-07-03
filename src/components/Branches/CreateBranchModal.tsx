import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/Ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CreateBranchModalProps {
  open: boolean
  onClose: () => void
  startPoint?: string
}

export function CreateBranchModal({ open, onClose, startPoint }: CreateBranchModalProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const { createBranch } = useGitMutations()

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <Modal open={open} title={t('modals.createBranch.title')} onClose={handleClose}>
      <div className="space-y-3 p-4">
        {startPoint && (
          <p className="text-xs text-gf-fg-subtle">
            {t('modals.createBranch.startAt')}{' '}
            <span className="font-mono text-gf-fg-muted">{startPoint.slice(0, 7)}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.createBranch.branchName')}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={createBranch.isPending}
            onClick={async () => {
              if (!name.trim()) return
              await createBranch.mutateAsync({
                name: name.trim(),
                ...(startPoint ? { startPoint } : {})
              })
              handleClose()
            }}
          >
            {t('common.create')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
