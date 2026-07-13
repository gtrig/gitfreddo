import { useQuery } from '@tanstack/react-query'
import type { GitlabListReposParams, GitlabRepo } from '@shared/gitlab'

export function useGitlabRepos(params?: GitlabListReposParams, enabled = true) {
  return useQuery<GitlabRepo[]>({
    queryKey: ['gitlab-repos', params?.search ?? '', params?.page ?? 1],
    queryFn: () => window.gitfreddo.gitlabListRepos(params),
    enabled,
    staleTime: 60_000
  })
}

export function useGitlabNamespaces(enabled = true) {
  return useQuery<string[]>({
    queryKey: ['gitlab-namespaces'],
    queryFn: () => window.gitfreddo.gitlabListNamespaces(),
    enabled,
    staleTime: 60_000
  })
}

export function useGitlabRepoContext(repoPath: string | null, enabled = true) {
  return useQuery({
    queryKey: ['gitlab-repo-context', repoPath],
    queryFn: () => {
      if (!repoPath) return null
      return window.gitfreddo.gitlabGetRepoContext(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}
