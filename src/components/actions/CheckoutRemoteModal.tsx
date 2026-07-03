import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { remoteBranchShortName } from '@/lib/branchTree'

interface CheckoutRemoteModalProps {
  open: boolean
  remoteBranch: string
  onClose: () => void
}

export function CheckoutRemoteModal({ open, remoteBranch, onClose }: CheckoutRemoteModalProps) {
  const { t } = useTranslation()
  const defaultLocal = remoteBranchShortName(remoteBranch)
  const [localName, setLocalName] = useState(defaultLocal)
  const { checkoutRemote } = useGitMutations()

  const handleClose = () => {
    setLocalName(defaultLocal)
    onClose()
  }

  return (
    <Modal open={open} title={t('modals.checkoutRemote.title')} onClose={handleClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {t('modals.checkoutRemote.description')}{' '}
          <span className="font-mono text-gf-fg">{remoteBranch.replace(/^remotes\//, '')}</span>
        </p>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">{t('modals.checkoutRemote.localBranchName')}</span>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>{t('common.cancel')}</ActionButton>
          <ActionButton
            loading={checkoutRemote.isPending}
            onClick={async () => {
              await checkoutRemote.mutateAsync({
                remoteBranch,
                localName: localName.trim() || undefined
              })
              handleClose()
            }}
          >
            {t('common.checkout')}
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
