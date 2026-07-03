import { useQuery } from '@tanstack/react-query'
import type { AppSettings } from '@shared/ipc'
import { useWorkspaceStore } from '@/stores/workspace'
import { useBranches, useRemotes } from '@/hooks/useGit'
import { resolveDefaultRemote } from '@/lib/git/remote'

export type { AppSettings }

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: () => window.gitfreddo.getSettings(),
    staleTime: 30_000
  })
}

export function usePollIntervalMs(): number {
  const { data } = useAppSettings()
  const interval = data?.pollIntervalMs ?? 5000
  return interval > 0 ? interval : 0
}

export function useDefaultRemote(): string {
  const { data } = useAppSettings()
  return data?.defaultRemote ?? 'origin'
}

export function useResolvedRemote(): string {
  const settingsRemote = useDefaultRemote()
  const connected = useWorkspaceStore((s) => s.connected)
  const { data: remotes } = useRemotes(connected)
  const { data: branches } = useBranches(connected)
  const current = branches?.find((branch) => branch.isCurrent)

  return resolveDefaultRemote(settingsRemote, remotes ?? [], current?.upstream)
}

export function useAiEnabled(): boolean {
  const { data } = useAppSettings()
  return Boolean(data?.aiBaseUrl?.trim())
}
