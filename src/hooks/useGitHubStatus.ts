import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitHubStatus } from '@shared/ipc'

export function useGitHubStatus() {
  return useQuery<GitHubStatus>({
    queryKey: ['github-status'],
    queryFn: () => window.gitfreddo.githubGetStatus(),
    staleTime: 10_000
  })
}

export function useInvalidateGitHubStatus() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['github-status'] })
}
