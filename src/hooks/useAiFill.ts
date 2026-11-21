import { useMutation } from '@tanstack/react-query'
import { useOperationStore } from '@/stores/operation'
import type { AiFillParams } from '@shared/ai'
import { activeRepoPath } from '@/lib/git/repoInvoke'

async function requestAiFill(params: AiFillParams): Promise<string> {
  const api = window.gitfreddo
  const repoPath = activeRepoPath()
  if (typeof api.aiFill === 'function') {
    return api.aiFill(params, repoPath)
  }
  return (await api.invoke('ai.fill', params, repoPath)) as string
}

export function useAiFill() {
  return useMutation({
    mutationFn: requestAiFill,
    onMutate: () => {
      useOperationStore.getState().begin('AI is working…')
    },
    onSettled: () => {
      useOperationStore.getState().end()
    }
  })
}
