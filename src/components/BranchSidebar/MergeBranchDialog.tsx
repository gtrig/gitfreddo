import { useState } from 'react'
import { Modal, ActionButton } from '@/components/ui/Modal'
import { useGitMutations } from '@/hooks/useGitMutations'
import { useBranches } from '@/hooks/useGit'
import { useWorkspaceStore } from '@/stores/workspace'

interface MergeBranchDialogProps {
  sourceBranch: string
  onClose: () => void
}

export function MergeBranchDialog({ sourceBranch, onClose }: MergeBranchDialogProps) {
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: branches } = useBranches(connected)
  const current = branches?.find((b) => b.isCurrent)
  const { merge } = useGitMutations()
  const [error, setError] = useState<string | null>(null)

  return (
    <Modal open title={`Merge ${sourceBranch}`} onClose={onClose}>
      <div className="space-y-3 p-4">
        <p className="text-sm text-gf-fg-muted">
          Merge <span className="text-gf-fg">{sourceBranch}</span> into{' '}
          <span className="text-gf-fg">{current?.name ?? 'current branch'}</span>?
        </p>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex justify-end gap-2">
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton
            loading={merge.isPending}
            onClick={async () => {
              try {
                await merge.mutateAsync({ branch: sourceBranch })
                onClose()
              } catch (err) {
                setError(err instanceof Error ? err.message : String(err))
              }
            }}
          >
            Merge
          </ActionButton>
        </div>
      </div>
    </Modal>
  )
}
