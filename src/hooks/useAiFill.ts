import { useMutation } from '@tanstack/react-query'
import type { AiFillParams } from '../../shared/ai'

async function requestAiFill(params: AiFillParams): Promise<string> {
  const api = window.gitfredo
  if (typeof api.aiFill === 'function') {
    return api.aiFill(params)
  }
  return (await api.invoke('ai.fill', params)) as string
}

export function useAiFill() {
  return useMutation({
    mutationFn: requestAiFill
  })
}
