import { useEffect, useState } from 'react'
import { Modal, ActionButton, FieldLabel, TextInput } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface StashBranchModalProps {
  open: boolean
  stashIndex: number
  onClose: () => void
}

export function StashBranchModal({ open, stashIndex, onClose }: StashBranchModalProps) {
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
    <Modal open={open} title="Create branch from stash" onClose={handleClose}>
      <div className="space-y-3">
        <p className="text-xs text-gf-fg-subtle">
          Create a new branch from <span className="font-mono text-gf-fg-muted">stash@{'{'}{stashIndex}{'}'}</span>
        </p>
        <div>
          <FieldLabel>Branch name</FieldLabel>
          <TextInput
            value={branchName}
            onChange={(event) => setBranchName(event.target.value)}
            placeholder="feature/from-stash"
            autoFocus
          />
        </div>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
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
            Create branch
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
