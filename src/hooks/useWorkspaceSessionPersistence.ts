import { useEffect, useRef } from 'react'
import { useWorkspaceStore } from '@/stores/workspace'
import { workspaceSessionKey } from '@/lib/workspace/workspaceSession'

export function useWorkspaceSessionPersistence(): void {
  const restoreWorkspaceSession = useWorkspaceStore((s) => s.restoreWorkspaceSession)
  const persistWorkspaceSession = useWorkspaceStore((s) => s.persistWorkspaceSession)
  const lastSessionKey = useRef<string | null>(null)

  useEffect(() => {
    void restoreWorkspaceSession()
  }, [restoreWorkspaceSession])

  useEffect(() => {
    const persistIfChanged = (tabPaths: string[], activePath: string | null) => {
      const key = workspaceSessionKey({ tabPaths, activePath })
      if (key === lastSessionKey.current) {
        return
      }
      lastSessionKey.current = key
      void persistWorkspaceSession()
    }

    const initial = useWorkspaceStore.getState()
    lastSessionKey.current = workspaceSessionKey({
      tabPaths: initial.tabs.map((tab) => tab.path),
      activePath: initial.activePath
    })

    return useWorkspaceStore.subscribe((state) => {
      persistIfChanged(
        state.tabs.map((tab) => tab.path),
        state.activePath
      )
    })
  }, [persistWorkspaceSession])

  useEffect(() => {
    const onBeforeUnload = () => {
      void persistWorkspaceSession()
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [persistWorkspaceSession])
}
