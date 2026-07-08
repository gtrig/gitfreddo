import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BitbucketPullRequest } from '@shared/bitbucket'

export function useBitbucketPullRequests(repoPath: string | null, enabled = true) {
  return useQuery<BitbucketPullRequest[]>({
    queryKey: ['bitbucket-pull-requests', repoPath],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfreddo.bitbucketListPullRequests(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateBitbucketPullRequests() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['bitbucket-pull-requests', repoPath] })
}
