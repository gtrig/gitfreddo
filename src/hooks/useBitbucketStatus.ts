import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BitbucketStatus } from '@shared/ipc'

export function useBitbucketStatus() {
  return useQuery<BitbucketStatus>({
    queryKey: ['bitbucket-status'],
    queryFn: () => window.gitfreddo.bitbucketGetStatus(),
    staleTime: 10_000
  })
}

export function useInvalidateBitbucketStatus() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['bitbucket-status'] })
  }
}

export function useSetBitbucketStatus() {
  const queryClient = useQueryClient()
  return (status: BitbucketStatus) => {
    queryClient.setQueryData(['bitbucket-status'], status)
  }
}
