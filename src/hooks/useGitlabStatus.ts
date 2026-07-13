import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { GitlabStatus } from '@shared/ipc'

export function useGitlabStatus() {
  return useQuery<GitlabStatus>({
    queryKey: ['gitlab-status'],
    queryFn: () => window.gitfreddo.gitlabGetStatus(),
    staleTime: 10_000
  })
}

export function useInvalidateGitlabStatus() {
  const queryClient = useQueryClient()
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ['gitlab-status'] })
  }
}

export function useSetGitlabStatus() {
  const queryClient = useQueryClient()
  return (status: GitlabStatus) => {
    queryClient.setQueryData(['gitlab-status'], status)
  }
}
