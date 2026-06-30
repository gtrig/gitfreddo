import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitHubPullRequest } from '../../shared/github'

export function useGitHubPullRequests(repoPath: string | null, enabled = true) {
  return useQuery<GitHubPullRequest[]>({
    queryKey: ['github-pull-requests', repoPath],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfredo.githubListPullRequests(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateGitHubPullRequests() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['github-pull-requests', repoPath] })
}
