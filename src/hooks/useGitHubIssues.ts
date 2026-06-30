import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitHubIssue } from '../../shared/github'

export function useGitHubIssues(
  repoPath: string | null,
  assigneeLogin?: string,
  enabled = true
) {
  return useQuery<GitHubIssue[]>({
    queryKey: ['github-issues', repoPath, assigneeLogin ?? ''],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfredo.githubListIssues(repoPath, assigneeLogin)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateGitHubIssues() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['github-issues', repoPath] })
}
