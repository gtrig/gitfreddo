import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useInvalidateGit } from '@/hooks/useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'
import { isNonFastForwardPushError } from '@/lib/remote'

export interface PushParams {
  remote?: string
  branch?: string
  setUpstream?: boolean
  force?: boolean
  pushAll?: boolean
}

export function usePushRemote() {
  const { t } = useTranslation()
  const invalidate = useInvalidateGit()
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const showToast = useToastStore((s) => s.show)
  const [forceConfirm, setForceConfirm] = useState<PushParams | null>(null)

  const push = useMutation({
    mutationFn: async (params: PushParams = {}) => {
      if (!repoPath) throw new Error(t('toast.noRepoConnected'))
      return window.gitfreddo.invoke('push', params)
    },
    onMutate: () => {
      useOperationStore.getState().begin()
    },
    onSettled: () => {
      useOperationStore.getState().end()
    },
    onSuccess: () => {
      invalidate('branch.list', 'working.status')
      showToast(t('toast.push.success'), 'success')
      setForceConfirm(null)
    },
    onError: (error, params) => {
      if (!params.force && isNonFastForwardPushError(error)) {
        setForceConfirm(params)
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      showToast(message || t('toast.push.error'), 'error')
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
