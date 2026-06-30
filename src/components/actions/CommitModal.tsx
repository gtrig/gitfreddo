import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CommitModalProps {
  open: boolean
  onClose: () => void
}

export function CommitModal({ open, onClose }: CommitModalProps) {
  const [message, setMessage] = useState('')
  const { commit } = useGitMutations()

  return (
    <Modal open={open} title="Create commit" onClose={onClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-zinc-400">Commit message</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-sm"
            placeholder="Describe your changes"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            onClick={async () => {
              if (!message.trim()) return
              await commit.mutateAsync({ message: message.trim() })
              setMessage('')
              onClose()
            }}
          >
            Commit
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
