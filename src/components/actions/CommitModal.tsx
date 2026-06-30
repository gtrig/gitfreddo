import { useMemo, useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { AiFillTextArea } from '@/components/ui/AiFillField'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useWorkingStatus } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'

interface CommitModalProps {
  open: boolean
  onClose: () => void
}

export function CommitModal({ open, onClose }: CommitModalProps) {
  const [message, setMessage] = useState('')
  const { commit } = useGitMutations()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: working } = useWorkingStatus(connected)

  const stagedPaths = useMemo(
    () => working?.staged.map((file) => file.path) ?? [],
    [working?.staged]
  )

  function handleClose() {
    setMessage('')
    onClose()
  }

  return (
    <Modal open={open} title="Create commit" onClose={handleClose}>
      <div className="space-y-3 p-4">
        <AiFillTextArea
          label="Commit message"
          value={message}
          onChange={setMessage}
          purpose="commit_message"
          context={{ filePaths: stagedPaths, branch: working?.branch }}
          rows={4}
          placeholder="Describe your changes"
        />
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            variant="primary"
            loading={commit.isPending}
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
