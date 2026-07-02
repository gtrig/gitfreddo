import { useEffect, useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useToastStore } from '@/stores/toast'

interface EditRemoteUrlModalProps {
  open: boolean
  remoteName: string
  currentUrl: string
  onClose: () => void
}

export function EditRemoteUrlModal({
  open,
  remoteName,
  currentUrl,
  onClose
}: EditRemoteUrlModalProps) {
  const [url, setUrl] = useState(currentUrl)
  const { remoteSetUrl } = useGitMutations()
  const show = useToastStore((s) => s.show)

  useEffect(() => {
    if (open) {
      setUrl(currentUrl)
    }
  }, [open, currentUrl])

  function handleClose() {
    setUrl(currentUrl)
    onClose()
  }

  return (
    <Modal open={open} title={`Edit URL — ${remoteName}`} onClose={handleClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">URL</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
            placeholder="https://github.com/user/repo.git"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            loading={remoteSetUrl.isPending}
            disabled={!url.trim()}
            onClick={async () => {
              await remoteSetUrl.mutateAsync({ name: remoteName, url: url.trim() })
              show(`Updated URL for "${remoteName}"`, 'success')
              handleClose()
            }}
          >
            Save
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
