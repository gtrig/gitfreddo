import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitHubPullRequest, GitHubPullRequestFile } from '@shared/github'

export function useGitHubPullRequest(
  repoPath: string | null,
  number: number | null,
  enabled = true
) {
  return useQuery<GitHubPullRequest>({
    queryKey: ['github-pull-request', repoPath, number],
    queryFn: () => {
      if (!repoPath || number === null) {
        throw new Error('Repository and pull request number are required')
      }
      return window.gitfreddo.githubGetPullRequest(repoPath, number)
    },
    enabled: enabled && Boolean(repoPath) && number !== null,
    staleTime: 30_000
  })
}

export function useGitHubPullRequestFiles(
  repoPath: string | null,
  number: number | null,
  enabled = true
) {
  return useQuery<GitHubPullRequestFile[]>({
    queryKey: ['github-pull-request-files', repoPath, number],
    queryFn: () => {
      if (!repoPath || number === null) {
        throw new Error('Repository and pull request number are required')
      }
      return window.gitfreddo.githubListPullRequestFiles(repoPath, number)
    },
    enabled: enabled && Boolean(repoPath) && number !== null,
    staleTime: 30_000
  })
}

export function useInvalidateGitHubPullRequestDetail() {
  const queryClient = useQueryClient()
  return (repoPath: string | null, number: number) => {
    void queryClient.invalidateQueries({ queryKey: ['github-pull-request', repoPath, number] })
    void queryClient.invalidateQueries({
      queryKey: ['github-pull-request-files', repoPath, number]
    })
    void queryClient.invalidateQueries({ queryKey: ['github-pull-requests', repoPath] })
  }
}
