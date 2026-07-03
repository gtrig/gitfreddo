import { useMutation } from '@tanstack/react-query'
import { useOperationStore } from '@/stores/operation'
import type { AiFillParams } from '@shared/ai'

async function requestAiFill(params: AiFillParams): Promise<string> {
  const api = window.gitfreddo
  if (typeof api.aiFill === 'function') {
    return api.aiFill(params)
  }
  return (await api.invoke('ai.fill', params)) as string
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
