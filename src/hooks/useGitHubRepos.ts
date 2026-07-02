import { useQuery } from '@tanstack/react-query'
import type { GitHubRepo } from '../../shared/github'
import type { GitHubListReposParams } from '../../shared/github'

export function useGitHubRepos(params?: GitHubListReposParams, enabled = true) {
  return useQuery<GitHubRepo[]>({
    queryKey: ['github-repos', params?.search ?? '', params?.page ?? 1],
    queryFn: () => window.gitfreddo.githubListRepos(params),
    enabled,
    staleTime: 60_000
  })
}

export function useGitHubRepoContext(repoPath: string | null, enabled = true) {
  return useQuery({
    queryKey: ['github-repo-context', repoPath],
    queryFn: () => {
      if (!repoPath) return null
      return window.gitfreddo.githubGetRepoContext(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}
