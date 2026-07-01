import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { isNonFastForwardPushError } from '@/lib/remote'

export interface PushParams {
  remote?: string
  branch?: string
  setUpstream?: boolean
  force?: boolean
}

export function usePushRemote() {
  const invalidate = useInvalidateGit()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [forceConfirm, setForceConfirm] = useState<PushParams | null>(null)

  const push = useMutation({
    mutationFn: async (params: PushParams = {}) => {
      if (!repoPath) throw new Error('No repository connected')
      return window.gitfredo.invoke('push', params)
    },
    onSuccess: () => {
      invalidate('branch.list', 'working.status')
      showToast('Pushed to remote', 'success')
      setForceConfirm(null)
    },
    onError: (error, params) => {
      if (!params.force && isNonFastForwardPushError(error)) {
        setForceConfirm(params)
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      showToast(message || 'Push failed', 'error')
    }
  })

  return {
    pushRemote: (params: PushParams = {}) => push.mutate(params),
    isPushPending: push.isPending,
    forceConfirm,
    confirmForcePush: () => {
      if (!forceConfirm) return
      push.mutate({ ...forceConfirm, force: true })
    },
    cancelForcePush: () => setForceConfirm(null)
  }
}
