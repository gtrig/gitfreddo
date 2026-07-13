import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitlabMergeRequest } from '@shared/gitlab'

export function useGitlabPullRequests(repoPath: string | null, enabled = true) {
  return useQuery<GitlabMergeRequest[]>({
    queryKey: ['gitlab-pull-requests', repoPath],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfreddo.gitlabListPullRequests(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateGitlabPullRequests() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['gitlab-pull-requests', repoPath] })
}
