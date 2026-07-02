import { useState } from 'react'
import type { GitTag } from '@/lib/types'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { localTagName } from '@/lib/tagNames'

interface DeleteTagModalProps {
  open: boolean
  tag: GitTag
  remote?: string
  defaultRemote?: string
  onClose: () => void
}

export function DeleteTagModal({
  open,
  tag,
  remote,
  defaultRemote,
  onClose
}: DeleteTagModalProps) {
  const [alsoDeleteRemote, setAlsoDeleteRemote] = useState(false)
  const { deleteTag } = useGitMutations()
  const shortName = localTagName(tag.name)
  const isRemoteOnly = Boolean(remote)
  const showRemoteOption = !isRemoteOnly && Boolean(defaultRemote)

  const handleClose = () => {
    setAlsoDeleteRemote(false)
    onClose()
  }

  return (
    <Modal
      open={open}
      title={isRemoteOnly ? 'Delete remote tag' : 'Delete tag'}
      onClose={handleClose}
    >
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          {isRemoteOnly
            ? `Delete remote tag "${tag.name}" from ${remote}?`
            : `Delete tag "${shortName}"?`}
        </p>
        {showRemoteOption && (
          <label className="flex items-center gap-2 text-sm text-gf-fg-muted">
            <input
              type="checkbox"
              checked={alsoDeleteRemote}
              onChange={(event) => setAlsoDeleteRemote(event.target.checked)}
            />
            Also delete from {defaultRemote}
          </label>
        )}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            variant="danger"
            loading={deleteTag.isPending}
            onClick={async () => {
              await deleteTag.mutateAsync({
                name: tag.name,
                ...(isRemoteOnly
                  ? { remote }
                  : alsoDeleteRemote && defaultRemote
                    ? { remote: defaultRemote, alsoDeleteRemote: true }
                    : {})
              })
              handleClose()
            }}
          >
            Delete
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
