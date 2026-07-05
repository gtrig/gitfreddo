import { useCallback, useEffect, useState } from 'react'
import { RepoSidebar } from '@/components/Layout/RepoSidebar'
import { TimelinePanel } from '@/components/TimelineGraph/TimelinePanel'
import { DiffOverlay } from '@/components/DiffViewer/DiffOverlay'
import { MergeConflictScreen } from '@/components/MergeConflicts/MergeConflictScreen'
import { DetailPanel } from '@/components/DetailPanel/DetailPanel'
import { ActionBar } from '@/components/Layout/ActionBar'
import { WorkspaceHub } from '@/components/Layout/WorkspaceHub'
import { WorkspaceTabs } from '@/components/Layout/WorkspaceTabs'
import { ToastBanner } from '@/components/Layout/ToastBanner'
import { UpdateBanner } from '@/components/Layout/UpdateBanner'
import { LogDrawer, useLogSubscription } from '@/components/Layout/LogDrawer'
import { HeaderToolsMenu } from '@/components/Layout/HeaderToolsMenu'
import { ResizableMainLayout } from '@/components/Layout/ResizableMainLayout'
import { SettingsModal } from '@/components/Settings/SettingsModal'
import { DocsModal } from '@/components/Help/DocsModal'
import { GlobalOperationOverlay } from '@/components/Ui/GlobalOperationOverlay'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAutoRefresh, useManualRefresh } from '@/hooks/useAutoRefresh'
import { useRepoChangeListener } from '@/hooks/useRepoChangeListener'
import { useAppLogger } from '@/hooks/useAppLogger'
import { useWorkspaceSessionPersistence } from '@/hooks/useWorkspaceSessionPersistence'
import { useSelectionStore } from '@/stores/selection'
import { appLog, useLogStore } from '@/stores/logs'
import { useLocale } from '@/hooks/useLocale'
import { useAppUpdate } from '@/hooks/useAppUpdate'
import type { MenuAction } from '@shared/ipc'

export default function App() {
  const tabs = useWorkspaceStore((s) => s.tabs)
  const activePath = useWorkspaceStore((s) => s.activePath)
  const openWorkspace = useWorkspaceStore((s) => s.openWorkspace)
  const closeWorkspacePicker = useWorkspaceStore((s) => s.closeWorkspacePicker)
  const workspacePickerOpen = useWorkspaceStore((s) => s.workspacePickerOpen)
  const openWorkspaceDialog = useWorkspaceStore((s) => s.openWorkspaceDialog)

  const [error, setError] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)
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
  useAutoRefresh()
  useRepoChangeListener()
  useLogSubscription()
  useAppLogger()
  useLocale()
  useWorkspaceSessionPersistence()
  const appUpdate = useAppUpdate()

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

  useEffect(() => {
    const unsubscribe = window.gitfreddo.onMenuAction((action: MenuAction) => {
      if (action === 'open-workspace') void openWorkspaceDialog()
      if (action === 'open-settings') setSettingsOpen(true)
      if (action === 'open-docs') setDocsOpen(true)
      if (action === 'refresh') {
        appLog('info', 'Manual refresh')
        refresh()
      }
      if (action === 'check-for-updates') {
        void appUpdate.checkForUpdates(true)
      }
      if (action === 'quit') void window.gitfreddo.disconnect()
    })
    return unsubscribe
  }, [appUpdate, openWorkspaceDialog, refresh])

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
      if (event.key === 'F1') {
        event.preventDefault()
        setDocsOpen(true)
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
        <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
        <LogDrawer />
        <UpdateBanner
          state={appUpdate.state}
          visible={appUpdate.bannerVisible}
          onDownload={() => void appUpdate.downloadUpdate()}
          onInstall={appUpdate.installUpdate}
          onDismiss={appUpdate.dismissBanner}
        />
      </>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-gf-bg text-gf-fg">
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
        <HeaderToolsMenu
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenDocs={() => setDocsOpen(true)}
        />
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
      />

      <GlobalOperationOverlay />
      <MergeConflictScreen />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DocsModal open={docsOpen} onClose={() => setDocsOpen(false)} />
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
      <ToastBanner />
      <UpdateBanner
        state={appUpdate.state}
        visible={appUpdate.bannerVisible}
        onDownload={() => void appUpdate.downloadUpdate()}
        onInstall={appUpdate.installUpdate}
        onDismiss={appUpdate.dismissBanner}
      />
    </div>
  )
}
