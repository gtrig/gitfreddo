import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { GitIpcMethod, GitIpcParams, GitIpcResult } from '@shared/git/ipc'
import { useWorkspaceStore } from '@/stores/workspace'

export function useRepoScope() {
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const connected = useWorkspaceStore((s) => s.connected)
  return { repoPath, connected }
}

export interface UseRepoQueryOptions<M extends GitIpcMethod, TData = GitIpcResult<M>> {
  method: M
  params?: GitIpcParams<M>
  extraKey?: unknown[]
  enabled?: boolean
  select?: (data: GitIpcResult<M>) => TData
}

/**
 * Shared TanStack Query wrapper for repo-scoped git IPC reads.
 */
export function useRepoQuery<M extends GitIpcMethod, TData = GitIpcResult<M>>(
  options: UseRepoQueryOptions<M, TData>
): UseQueryResult<TData> {
  const { repoPath, connected } = useRepoScope()
  const enabled = options.enabled ?? true
  const extraKey = options.extraKey ?? []

  return useQuery({
    queryKey: ['repo', repoPath, options.method, ...extraKey],
    queryFn: async () => {
      const result =
        options.params === undefined
          ? await window.gitfreddo.invoke(options.method)
          : await window.gitfreddo.invoke(options.method, options.params as never)
      return options.select ? options.select(result) : (result as TData)
    },
    enabled: enabled && connected && Boolean(repoPath)
  })
}
