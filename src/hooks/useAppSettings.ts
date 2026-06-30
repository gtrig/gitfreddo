import { useQuery } from '@tanstack/react-query'
import type { AppSettings } from '../../shared/ipc'

export type { AppSettings }

export function useAppSettings() {
  return useQuery<AppSettings>({
    queryKey: ['app-settings'],
    queryFn: () => window.gitfredo.getSettings(),
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
