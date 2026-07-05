import type { Query, QueryClient } from '@tanstack/react-query'
import {
  isRepoChangeDiffQuerySuffix,
  REPO_CHANGE_REFS_QUERY_SUFFIXES,
  REPO_CHANGE_WORKING_QUERY_SUFFIXES,
  type RepoChangeEvent
} from '@shared/repo-change'
import { useOperationStore } from '@/stores/operation'

export function invalidateRepoChange(
  queryClient: QueryClient,
  event: RepoChangeEvent
): void {
  const { repoPath, scope } = event

  if (scope === 'refs') {
    for (const suffix of REPO_CHANGE_REFS_QUERY_SUFFIXES) {
      void queryClient.invalidateQueries({ queryKey: ['repo', repoPath, suffix] })
    }
    return
  }

  for (const suffix of REPO_CHANGE_WORKING_QUERY_SUFFIXES) {
    void queryClient.invalidateQueries({ queryKey: ['repo', repoPath, suffix] })
  }

  void queryClient.invalidateQueries({
    predicate: (query: Query) => {
      const key = query.queryKey
      return (
        key[0] === 'repo' &&
        key[1] === repoPath &&
        isRepoChangeDiffQuerySuffix(key[2])
      )
    }
  })
}

export function shouldHandleRepoChangeEvent(): boolean {
  return useOperationStore.getState().count === 0
}
