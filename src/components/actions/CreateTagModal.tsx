import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface CreateTagModalProps {
  open: boolean
  onClose: () => void
  target?: string
}

export function CreateTagModal({ open, onClose, target }: CreateTagModalProps) {
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const { createTag } = useGitMutations()

  const handleClose = () => {
    setName('')
    setMessage('')
    onClose()
  }

  return (
    <Modal open={open} title="Create tag" onClose={handleClose}>
      <div className="space-y-3 p-4">
        {target && (
          <p className="text-xs text-gf-fg-subtle">
            Tag will point at{' '}
            <span className="font-mono text-gf-fg-muted">{target.slice(0, 7)}</span>
          </p>
        )}
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Tag name</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="v1.0.0"
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Message (optional)</span>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Annotated tag message"
            rows={3}
            className="mt-1 w-full resize-y rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
          <p className="mt-1 text-xs text-gf-fg-subtle">
            Leave empty for a lightweight tag, or add a message to create an annotated tag.
          </p>
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            loading={createTag.isPending}
            onClick={async () => {
              if (!name.trim()) return
              await createTag.mutateAsync({
                name: name.trim(),
                ...(target ? { target } : {}),
                ...(message.trim() ? { message: message.trim() } : {})
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
