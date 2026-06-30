import { useMutation } from '@tanstack/react-query'
import type { AiFillParams } from '../../shared/ai'

export function useAiFill() {
  return useMutation({
    mutationFn: (params: AiFillParams) => window.gitfredo.aiFill(params)
  })
}
