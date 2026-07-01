import { useEffect, useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface RenameBranchModalProps {
  open: boolean
  currentName: string
  onClose: () => void
}

export function RenameBranchModal({ open, currentName, onClose }: RenameBranchModalProps) {
  const [name, setName] = useState(currentName)
  const { renameBranch } = useGitMutations()

  useEffect(() => {
    if (open) setName(currentName)
  }, [open, currentName])

  const handleClose = () => {
    setName('')
    onClose()
  }

  const trimmed = name.trim()
  const canSubmit = trimmed.length > 0 && trimmed !== currentName

  return (
    <Modal open={open} title="Rename branch" onClose={handleClose}>
      <div className="space-y-3 p-4">
        <p className="text-xs text-gf-fg-subtle">
          Rename <span className="font-mono text-gf-fg-muted">{currentName}</span>
        </p>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">New name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            autoFocus
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            loading={renameBranch.isPending}
            disabled={!canSubmit}
            onClick={async () => {
              if (!canSubmit) return
              await renameBranch.mutateAsync({ oldName: currentName, newName: trimmed })
              handleClose()
            }}
          >
            Rename
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
