import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { remoteBranchShortName } from '@/lib/branchTree'

interface CheckoutRemoteModalProps {
  open: boolean
  remoteBranch: string
  onClose: () => void
}

export function CheckoutRemoteModal({ open, remoteBranch, onClose }: CheckoutRemoteModalProps) {
  const defaultLocal = remoteBranchShortName(remoteBranch)
  const [localName, setLocalName] = useState(defaultLocal)
  const { checkoutRemote } = useGitMutations()

  const handleClose = () => {
    setLocalName(defaultLocal)
    onClose()
  }

  return (
    <Modal open={open} title="Checkout remote branch" onClose={handleClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          Create or checkout local branch tracking{' '}
          <span className="font-mono text-gf-fg">{remoteBranch.replace(/^remotes\//, '')}</span>
        </p>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Local branch name</span>
          <input
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
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
            Checkout
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
