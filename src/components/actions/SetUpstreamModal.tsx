import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'

interface SetUpstreamModalProps {
  open: boolean
  branchName: string
  currentUpstream?: string
  onClose: () => void
}

export function SetUpstreamModal({
  open,
  branchName,
  currentUpstream,
  onClose
}: SetUpstreamModalProps) {
  const [upstream, setUpstream] = useState(currentUpstream ?? '')
  const { setUpstream: setUpstreamMutation } = useGitMutations()

  const handleClose = () => {
    setUpstream(currentUpstream ?? '')
    onClose()
  }

  return (
    <Modal open={open} title={`Set upstream for ${branchName}`} onClose={handleClose}>
      <div className="space-y-3 p-4">
        <label className="block text-sm">
          <span className="text-gf-fg-muted">Upstream (remote/branch)</span>
          <input
            value={upstream}
            onChange={(e) => setUpstream(e.target.value)}
            placeholder="origin/main"
            className="mt-1 w-full rounded border border-gf-border-strong bg-gf-bg px-2 py-1.5"
          />
        </label>
        <div className="flex justify-end gap-2">
          <ActionButton onClick={handleClose}>Cancel</ActionButton>
          <ActionButton
            loading={setUpstreamMutation.isPending}
            onClick={async () => {
              if (!upstream.trim()) return
              await setUpstreamMutation.mutateAsync({
                branch: branchName,
                upstream: upstream.trim()
              })
              handleClose()
            }}
          >
            Set upstream
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
