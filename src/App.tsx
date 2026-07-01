import { useCallback, useEffect, useState } from 'react'
import { RepoSidebar } from '@/components/layout/RepoSidebar'
import { TimelinePanel } from '@/components/TimelineGraph/TimelinePanel'
import { DiffOverlay } from '@/components/DiffViewer/DiffOverlay'
import { DetailPanel } from '@/components/DetailPanel/DetailPanel'
import { ActionBar } from '@/components/actions/ActionBar'
import { WorkspaceHub } from '@/components/layout/WorkspaceHub'
import { WorkspaceBanner } from '@/components/layout/WorkspaceBanner'
import { WorkspaceTabs } from '@/components/layout/WorkspaceTabs'
import { ToastBanner } from '@/components/layout/ToastBanner'
import { LogDrawer, useLogSubscription } from '@/components/layout/LogDrawer'
import { HeaderToolsMenu } from '@/components/layout/HeaderToolsMenu'
import { ResizableMainLayout } from '@/components/layout/ResizableMainLayout'
import { SettingsModal } from '@/components/settings/SettingsModal'
import { Spinner } from '@/components/ui/Spinner'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAutoRefresh, useManualRefresh } from '@/hooks/useAutoRefresh'
import { useAppLogger } from '@/hooks/useAppLogger'
import { useWorkspaceSessionPersistence } from '@/hooks/useWorkspaceSessionPersistence'
import { useSelectionStore } from '@/stores/selection'
import { appLog, useLogStore } from '@/stores/logs'
import type { MenuAction } from '../shared/ipc'

export default function App() {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activePath = useWorkspaceStore((s) => s.activePath)
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const closeWorkspacePicker = useWorkspaceStore((s) => s.closeWorkspacePicker)
  const workspacePickerOpen = useWorkspaceStore((s) => s.workspacePickerOpen)
  const openWorkspaceDialog = useWorkspaceStore((s) => s.openWorkspaceDialog)
  const reconnectActive = useWorkspaceStore((s) => s.reconnectActive)

  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const refresh = useManualRefresh()
  const selectedWorkingFile = useSelectionStore((s) => s.selectedWorkingFile)
  const selectedCommitFile = useSelectionStore((s) => s.selectedCommitFile)
  const selectedStashFile = useSelectionStore((s) => s.selectedStashFile)
  const diffMode = useSelectionStore((s) => s.diffMode)
  const closeDiffOverlay = useSelectionStore((s) => s.closeDiffOverlay)

  const selectedStashIndex = useSelectionStore((s) => s.selectedStashIndex)
  const diffOverlayOpen = Boolean(
    selectedWorkingFile ||
      selectedCommitFile ||
      selectedStashFile ||
      (diffMode === 'stash' && selectedStashIndex !== null) ||
      diffMode === 'commit-range'
  )
  const activeTab = tabs.find((tab) => tab.path === activePath)
  const connecting = Boolean(activeTab?.connecting)

  useAutoRefresh()
  useLogSubscription()
  useAppLogger()
  useWorkspaceSessionPersistence()

  const connectWorkspace = useCallback(
    async (path: string) => {
      setError(null)
      try {
        await openWorkspace(path)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    },
    [openWorkspace]
  )

  const reconnect = useCallback(async () => {
    setError(null)
    try {
      await reconnectActive()
      refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      throw err
    }
  }, [reconnectActive, refresh])

  useEffect(() => {
    const unsubscribe = window.gitfredo.onMenuAction((action: MenuAction) => {
      if (action === 'open-workspace') void openWorkspaceDialog()
      if (action === 'open-settings') setSettingsOpen(true)
      if (action === 'refresh') {
        appLog('info', 'Manual refresh')
        refresh()
      }
      if (action === 'quit') void window.gitfredo.disconnect()
    })
    return unsubscribe
  }, [openWorkspaceDialog, refresh])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      if (!mod) return
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()
        refresh()
      }
      if (event.key === 'o' || event.key === 'O') {
        event.preventDefault()
        void openWorkspaceDialog()
      }
      if (event.key === ',') {
        event.preventDefault()
        setSettingsOpen(true)
      }
      if (event.key === '`' && mod) {
        event.preventDefault()
        useLogStore.getState().toggleOpen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openWorkspaceDialog, refresh])

  if (tabs.length === 0) {
    return (
      <>
        <WorkspaceHub variant="page" onOpen={connectWorkspace} />
        <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <LogDrawer />
      </>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gf-bg text-gf-fg">
      <WorkspaceBanner onReconnect={reconnect} />
      <ToastBanner />
      {error && (
        <div className="border-b border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      <WorkspaceTabs />
      <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-gf-border px-4 py-2">
        <p className="min-w-0 truncate text-sm text-gf-fg-subtle" title={activePath ?? undefined}>
          {activePath}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <ActionBar />
        </div>
        <HeaderToolsMenu onOpenSettings={() => setSettingsOpen(true)} />
      </header>

      <ResizableMainLayout
        left={<RepoSidebar />}
        center={
          <>
            <TimelinePanel />
            {diffOverlayOpen && <DiffOverlay onClose={closeDiffOverlay} />}
          </>
        }
        right={<DetailPanel />}
        overlay={
          connecting ? (
            <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-gf-bg-deep/40">
              <p className="flex items-center gap-2 rounded bg-gf-bg px-4 py-2 text-sm text-gf-fg-muted">
                <Spinner />
                Opening repository…
              </p>
            </div>
          ) : null
        }
      />

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <WorkspaceHub
        variant="modal"
        open={workspacePickerOpen}
        onClose={closeWorkspacePicker}
        onOpen={async (path) => {
          setError(null)
          try {
            await openWorkspace(path)
            closeWorkspacePicker()
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
            throw err
          }
        }}
      />
      <LogDrawer />
    </div>
  )
}
