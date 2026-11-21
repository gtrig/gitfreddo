import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToastStore } from '@/stores/toast'
import { useOperationStore } from '@/stores/operation'
import { isNonFastForwardPushError } from '@/lib/git/remote'
import { activeRepoPath } from '@/lib/git/repoInvoke'

export interface PushParams {
  remote?: string
  branch?: string
  setUpstream?: boolean
  force?: boolean
  pushAll?: boolean
}

interface PushVariables {
  params: PushParams
  repoPath: string | null
}

export function usePushRemote() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const showToast = useToastStore((s) => s.show)
  const [forceConfirm, setForceConfirm] = useState<PushVariables | null>(null)

  const push = useMutation({
    mutationFn: async ({ params, repoPath }: PushVariables) => {
      if (!repoPath) throw new Error(t('toast.noRepoConnected'))
      return window.gitfreddo.invoke('push', params, repoPath)
    },
    onMutate: () => {
      useOperationStore.getState().begin()
    },
    onSettled: () => {
      useOperationStore.getState().end()
    },
    onSuccess: (_data, { repoPath }) => {
      for (const suffix of ['branch.list', 'working.status']) {
        void queryClient.invalidateQueries({ queryKey: ['repo', repoPath, suffix] })
      }
      showToast(t('toast.push.success'), 'success')
      setForceConfirm(null)
    },
    onError: (error, variables) => {
      if (!variables.params.force && isNonFastForwardPushError(error)) {
        setForceConfirm(variables)
        return
      }
      const message = error instanceof Error ? error.message : String(error)
      showToast(message || t('toast.push.error'), 'error')
    }
  })

  return {
    // Capture the target repo at call time so a tab switch can't redirect the push.
    pushRemote: (params: PushParams = {}) =>
      push.mutate({ params, repoPath: activeRepoPath() ?? null }),
    isPushPending: push.isPending,
    forceConfirm: forceConfirm?.params ?? null,
    confirmForcePush: () => {
      if (!forceConfirm) return
      push.mutate({ ...forceConfirm, params: { ...forceConfirm.params, force: true } })
    },
    cancelForcePush: () => setForceConfirm(null)
  }
}
