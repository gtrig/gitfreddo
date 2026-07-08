import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BitbucketIssue } from '@shared/bitbucket'

export function useBitbucketIssues(
  repoPath: string | null,
  assigneeLogin?: string,
  enabled = true
) {
  return useQuery<BitbucketIssue[]>({
    queryKey: ['bitbucket-issues', repoPath, assigneeLogin ?? ''],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfreddo.bitbucketListIssues(repoPath, assigneeLogin)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateBitbucketIssues() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['bitbucket-issues', repoPath] })
}
