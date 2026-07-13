import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitlabIssue } from '@shared/gitlab'

export function useGitlabIssues(
  repoPath: string | null,
  assigneeLogin?: string,
  enabled = true
) {
  return useQuery<GitlabIssue[]>({
    queryKey: ['gitlab-issues', repoPath, assigneeLogin ?? ''],
    queryFn: () => {
      if (!repoPath) return []
      return window.gitfreddo.gitlabListIssues(repoPath, assigneeLogin)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}

export function useInvalidateGitlabIssues() {
  const queryClient = useQueryClient()
  return (repoPath: string | null) =>
    queryClient.invalidateQueries({ queryKey: ['gitlab-issues', repoPath] })
}
