import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { BitbucketIssue, BitbucketIssuesUnavailableReason } from '@shared/bitbucket'
import { parseBitbucketIssuesUnavailable } from '@shared/bitbucket'

export function useBitbucketIssues(
  repoPath: string | null,
  assigneeLogin?: string,
  enabled = true
) {
  const query = useQuery<BitbucketIssue[]>({
    queryKey: ['bitbucket-issues', repoPath, assigneeLogin ?? ''],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfreddo.bitbucketListIssues(repoPath, assigneeLogin)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })

  const unavailableReason: BitbucketIssuesUnavailableReason | null = query.isError
    ? parseBitbucketIssuesUnavailable(query.error)
    : null

  return {
    ...query,
    unavailableReason,
    error: unavailableReason ? null : query.error
  }
}

export function useInvalidateBitbucketIssues() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['bitbucket-issues', repoPath] })
}
