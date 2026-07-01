import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CreateBranchModalProps {
  open: boolean
  onClose: () => void
  startPoint?: string
}

export function CreateBranchModal({ open, onClose, startPoint }: CreateBranchModalProps) {
  const [name, setName] = useState('')
  const { createBranch } = useGitMutations()

  const handleClose = () => {
    setName('')
    onClose()
  }

  return (
    <Modal open={open} title="Create branch" onClose={handleClose}>
      <div className="space-y-3 p-4">
        {startPoint && (
          <p className="text-xs text-gf-fg-subtle">
            Branch will start at{' '}
            <span className="font-mono text-gf-fg-muted">{startPoint.slice(0, 7)}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Branch name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
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
            Create
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}

