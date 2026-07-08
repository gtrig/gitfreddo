import { useQuery } from '@tanstack/react-query'
import type { BitbucketListReposParams, BitbucketRepo } from '@shared/bitbucket'

export function useBitbucketRepos(params?: BitbucketListReposParams, enabled = true) {
  return useQuery<BitbucketRepo[]>({
    queryKey: ['bitbucket-repos', params?.search ?? '', params?.page ?? 1],
    queryFn: () => window.gitfreddo.bitbucketListRepos(params),
    enabled,
    staleTime: 60_000
  })
}

export function useBitbucketWorkspaces(enabled = true) {
  return useQuery<string[]>({
    queryKey: ['bitbucket-workspaces'],
    queryFn: () => window.gitfreddo.bitbucketListWorkspaces(),
    enabled,
    staleTime: 60_000
  })
}

export function useBitbucketRepoContext(repoPath: string | null, enabled = true) {
  return useQuery({
    queryKey: ['bitbucket-repo-context', repoPath],
    queryFn: () => {
      if (!repoPath) return null
      return window.gitfreddo.bitbucketGetRepoContext(repoPath)
    },
    enabled: enabled && Boolean(repoPath),
    staleTime: 30_000
  })
}
