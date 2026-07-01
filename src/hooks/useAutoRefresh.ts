import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useWorkspaceStore } from '@/stores/workspace'
import { usePollIntervalMs } from './useAppSettings'

const REFRESH_SUFFIXES = [
  'status',
  'working.status',
  'branch.list',
  'log.graph',
  'remote.list',
  'stash.list',
  'tag.list',
  'merge.status'
] as const

export function useAutoRefresh() {
  const connected = useWorkspaceStore((s) => s.connected)
  const repoPath = useWorkspaceStore((s) => s.activePath)
  const pollIntervalMs = usePollIntervalMs()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!connected || !repoPath || pollIntervalMs <= 0) return

    const id = window.setInterval(() => {
      for (const suffix of REFRESH_SUFFIXES) {
        void queryClient.invalidateQueries({ queryKey: ['repo', repoPath, suffix] })
      }
    }, pollIntervalMs)

    return () => window.clearInterval(id)
  }, [connected, repoPath, pollIntervalMs, queryClient])
}

export function useManualRefresh() {
  const queryClient = useQueryClient()
  const repoPath = useWorkspaceStore((s) => s.activePath)

  return () => {
    if (repoPath) {
      void queryClient.invalidateQueries({ queryKey: ['repo', repoPath] })
      return
    }
    void queryClient.invalidateQueries()
  }
}
