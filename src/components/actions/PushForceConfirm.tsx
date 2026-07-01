import { ConfirmDialog } from '@/components/ui/Modal'
import type { PushParams } from '@/hooks/usePushRemote'

interface PushForceConfirmProps {
  params: PushParams | null
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function PushForceConfirm({ params, busy, onConfirm, onCancel }: PushForceConfirmProps) {
  if (!params) return null

  const branch = params.branch?.trim() || 'the current branch'
  const remote = params.remote?.trim() || 'the remote'

  return (
    <ConfirmDialog
      open
      title="Force push?"
      message={`The remote has commits that are not in your local ${branch}. Force pushing will overwrite ${remote} with your local branch.`}
      confirmLabel="Force push"
      busy={busy}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  )
}
