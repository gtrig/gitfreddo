import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'

export function useInvalidateGit() {
  const queryClient = useQueryClient()
  const repoPath = useWorkspaceStore((s) => s.activePath)

  return useCallback(
    (...suffixes: string[]) => {
      if (!repoPath) return
      if (suffixes.length === 0) {
        void queryClient.invalidateQueries({ queryKey: ['repo', repoPath] })
        return
      }
      for (const suffix of suffixes) {
        void queryClient.invalidateQueries({ queryKey: ['repo', repoPath, suffix] })
      }
    },
    [queryClient, repoPath]
  )
}
