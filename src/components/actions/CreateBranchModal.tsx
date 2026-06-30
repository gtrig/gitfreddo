import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CreateBranchModalProps {
  open: boolean
  onClose: () => void
}

export function CreateBranchModal({ open, onClose }: CreateBranchModalProps) {
  const [name, setName] = useState('')
  const { createBranch } = useGitMutations()

  return (
    <Modal open={open} title="Create branch" onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-zinc-400">Branch name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            onClick={async () => {
              if (!name.trim()) return
              await createBranch.mutateAsync({ name: name.trim() })
              setName('')
              onClose()
            }}
          >
            Create
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}

