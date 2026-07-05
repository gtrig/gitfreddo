import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { invalidateRepoChange, shouldHandleRepoChangeEvent } from '@/lib/git/repoChange'
import type { RepoChangeEvent } from '@shared/repo-change'

export function useRepoChangeListener(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onRepoChanged((event: RepoChangeEvent) => {
      if (!shouldHandleRepoChangeEvent()) {
        return
      }
      invalidateRepoChange(queryClient, event)
    })
    return unsubscribe
  }, [queryClient])
}
