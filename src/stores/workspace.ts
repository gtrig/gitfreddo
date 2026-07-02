import { create } from 'zustand'
import {
  captureSelectionForWorkspace,
  restoreSelectionForWorkspace,
  clearSelectionSnapshot,
  migrateSelectionSnapshot
} from '@/stores/selection'
import { appLog } from '@/stores/logs'
import {
  orderPathsForRestore,
  snapshotFromSettings,
  type WorkspaceSessionSnapshot
} from '@/lib/workspaceSession'

export interface WorkspaceTab {
  path: string
  connected: boolean
  processExited: boolean
  connecting: boolean
}

interface WorkspaceState {
  tabs: WorkspaceTab[]
  activePath: string | null
  workspacePickerOpen: boolean
  /** @deprecated use activePath */
  workspacePath: string | null
  connected: boolean
  processExited: boolean
  openWorkspace: (path: string) => Promise<void>
  switchWorkspace: (path: string) => Promise<void>
  closeWorkspace: (path: string) => Promise<void>
  openWorkspacePicker: () => void
  closeWorkspacePicker: () => void
  openWorkspaceDialog: () => void
  reconnectActive: () => Promise<void>
  restoreWorkspaceSession: () => Promise<void>
  persistWorkspaceSession: () => Promise<void>
  handleProcessExit: (path: string) => void
  /** @deprecated */
  setWorkspacePath: (path: string | null) => void
  /** @deprecated */
  setConnected: (connected: boolean) => void
  /** @deprecated */
  setProcessExited: (exited: boolean) => void
}

function tabLabel(path: string): string {
  const parts = path.replace(/[/\\]+$/, '').split(/[/\\]/)
  return parts[parts.length - 1] || path
}

export { tabLabel as workspaceTabLabel }

function syncLegacyFields(tabs: WorkspaceTab[], activePath: string | null) {
  const tab = tabs.find((item) => item.path === activePath)
  return {
    workspacePath: activePath,
    connected: Boolean(tab?.connected && !tab.processExited),
    processExited: Boolean(tab?.processExited)
  }
}

function updateTab(
  tabs: WorkspaceTab[],
  path: string,
  patch: Partial<WorkspaceTab>
): WorkspaceTab[] {
  return tabs.map((tab) => (tab.path === path ? { ...tab, ...patch } : tab))
}

function remapTabPath(tabs: WorkspaceTab[], fromPath: string, toPath: string): WorkspaceTab[] {
  if (fromPath === toPath) {
    return tabs
  }
  migrateSelectionSnapshot(fromPath, toPath)
  return tabs.map((tab) => (tab.path === fromPath ? { ...tab, path: toPath } : tab))
}

async function ensureBackendWorkspace(path: string): Promise<string> {
  try {
    return await window.gitfreddo.switchWorkspace(path)
  } catch {
    return window.gitfreddo.connect(path)
  }
}

async function persistWorkspaceSessionSnapshot(snapshot: WorkspaceSessionSnapshot): Promise<void> {
  await window.gitfreddo.setSettings({
    openRepoTabs: snapshot.tabPaths,
    activeRepoTab: snapshot.activePath
  })
}

function sessionSnapshotFromState(tabs: WorkspaceTab[], activePath: string | null): WorkspaceSessionSnapshot {
  return {
    tabPaths: tabs.map((tab) => tab.path),
    activePath
  }
}

let sessionRestorePromise: Promise<void> | null = null

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  tabs: [],
  activePath: null,
  workspacePickerOpen: false,
  workspacePath: null,
  connected: false,
  processExited: false,

  openWorkspace: async (path) => {
    const canonical = await window.gitfreddo.normalizeRepoPath(path)
    const { tabs, activePath } = get()
    const existing = tabs.find((tab) => tab.path === canonical)
    if (existing) {
      appLog('info', 'Switched to existing workspace tab', canonical)
      await get().switchWorkspace(canonical)
      return
    }

    if (activePath) {
      captureSelectionForWorkspace(activePath)
    }

    const nextTabs = [
      ...tabs,
      { path: canonical, connected: false, processExited: false, connecting: true }
    ]
    set({ tabs: nextTabs, activePath: canonical, ...syncLegacyFields(nextTabs, canonical) })
    appLog('info', 'Opening workspace', canonical)

    try {
      const connectedPath = await window.gitfreddo.connect(canonical)
      let currentTabs = remapTabPath(get().tabs, canonical, connectedPath)
      currentTabs = updateTab(currentTabs, connectedPath, {
        connected: true,
        processExited: false,
        connecting: false
      })
      set({
        tabs: currentTabs,
        activePath: connectedPath,
        ...syncLegacyFields(currentTabs, connectedPath)
      })
      restoreSelectionForWorkspace(connectedPath)
      appLog('info', 'Workspace connected', connectedPath)
    } catch (error) {
      const remaining = get().tabs.filter((tab) => tab.path !== canonical)
      const nextActive = remaining[0]?.path ?? null
      set({
        tabs: remaining,
        activePath: nextActive,
        ...syncLegacyFields(remaining, nextActive)
      })
      clearSelectionSnapshot(canonical)
      if (nextActive) {
        restoreSelectionForWorkspace(nextActive)
      }
      appLog('error', 'Failed to open workspace', error instanceof Error ? error.message : String(error))
      throw error
    }
  },

  switchWorkspace: async (path) => {
    const canonical = await window.gitfreddo.normalizeRepoPath(path)
    let { tabs, activePath } = get()
    tabs = remapTabPath(tabs, path, canonical)

    if (activePath === canonical) {
      if (tabs !== get().tabs) {
        set({ tabs, ...syncLegacyFields(tabs, canonical) })
      }
      return
    }

    const target = tabs.find((tab) => tab.path === canonical)
    if (!target) {
      throw new Error(`Workspace tab not found: ${canonical}`)
    }

    if (activePath) {
      captureSelectionForWorkspace(activePath)
    }

    const activeCanonical = await ensureBackendWorkspace(canonical)
    const nextTabs = remapTabPath(tabs, canonical, activeCanonical)
    const connectedTabs = updateTab(nextTabs, activeCanonical, {
      connected: true,
      processExited: false,
      connecting: false
    })

    set({
      tabs: connectedTabs,
      activePath: activeCanonical,
      ...syncLegacyFields(connectedTabs, activeCanonical)
    })
    appLog('info', 'Switched workspace', activeCanonical)
    restoreSelectionForWorkspace(activeCanonical)
  },

  closeWorkspace: async (path) => {
    const canonical = await window.gitfreddo.normalizeRepoPath(path)
    let { tabs, activePath } = get()
    tabs = remapTabPath(tabs, path, canonical)
    const remaining = tabs.filter((tab) => tab.path !== canonical)
    const wasActive = activePath === canonical

    if (wasActive) {
      captureSelectionForWorkspace(canonical)
    }

    await window.gitfreddo.disconnectWorkspace(canonical)
    clearSelectionSnapshot(canonical)

    let nextActive = activePath
    if (wasActive) {
      const closedIndex = tabs.findIndex((tab) => tab.path === canonical)
      const neighbor = remaining[closedIndex] ?? remaining[closedIndex - 1]
      nextActive = neighbor?.path ?? null
      if (nextActive) {
        await ensureBackendWorkspace(nextActive)
        restoreSelectionForWorkspace(nextActive)
      }
    }

    set({
      tabs: remaining,
      activePath: nextActive,
      ...syncLegacyFields(remaining, nextActive)
    })
    appLog('info', 'Closed workspace tab', canonical)
  },

  openWorkspacePicker: () => {
    appLog('info', 'Opened workspace picker')
    set({ workspacePickerOpen: true })
  },

  closeWorkspacePicker: () => set({ workspacePickerOpen: false }),

  openWorkspaceDialog: () => {
    get().openWorkspacePicker()
  },

  persistWorkspaceSession: async () => {
    const { tabs, activePath } = get()
    await persistWorkspaceSessionSnapshot(sessionSnapshotFromState(tabs, activePath))
  },

  restoreWorkspaceSession: async () => {
    if (sessionRestorePromise) {
      return sessionRestorePromise
    }

    sessionRestorePromise = (async () => {
      if (get().tabs.length > 0) {
        return
      }

      const settings = await window.gitfreddo.getSettings()
      const snapshot = snapshotFromSettings(settings)
      if (snapshot.tabPaths.length === 0) {
        return
      }

      const normalizedPaths: string[] = []
      for (const path of snapshot.tabPaths) {
        try {
          normalizedPaths.push(await window.gitfreddo.normalizeRepoPath(path))
        } catch {
          appLog('warn', 'Skipped invalid saved workspace tab', path)
        }
      }

      if (normalizedPaths.length === 0) {
        await persistWorkspaceSessionSnapshot({ tabPaths: [], activePath: null })
        return
      }

      let activePath = snapshot.activePath
      if (activePath) {
        try {
          activePath = await window.gitfreddo.normalizeRepoPath(activePath)
        } catch {
          activePath = null
        }
      }
      if (activePath && !normalizedPaths.includes(activePath)) {
        activePath = null
      }

      const { connectOrder, activePath: resolvedActive } = orderPathsForRestore(
        normalizedPaths,
        activePath
      )

      const shells: WorkspaceTab[] = normalizedPaths.map((path) => ({
        path,
        connected: false,
        processExited: false,
        connecting: true
      }))
      set({
        tabs: shells,
        activePath: resolvedActive,
        ...syncLegacyFields(shells, resolvedActive)
      })
      appLog('info', `Restoring ${normalizedPaths.length} workspace tab(s)`)

      const failed = new Set<string>()
      for (const path of connectOrder) {
        try {
          const connectedPath = await window.gitfreddo.connect(path)
          let tabs = remapTabPath(get().tabs, path, connectedPath)
          tabs = updateTab(tabs, connectedPath, {
            connected: true,
            processExited: false,
            connecting: false
          })
          set({ tabs, ...syncLegacyFields(tabs, get().activePath) })
        } catch (error) {
          failed.add(path)
          appLog(
            'warn',
            'Failed to restore workspace tab',
            error instanceof Error ? error.message : String(error)
          )
        }
      }

      let tabs = get().tabs.filter((tab) => !failed.has(tab.path))
      let nextActive = get().activePath
      if (nextActive && failed.has(nextActive)) {
        nextActive = tabs[0]?.path ?? null
      }
      if (!nextActive && tabs.length > 0) {
        nextActive = tabs[0].path
      }

      set({
        tabs,
        activePath: nextActive,
        ...syncLegacyFields(tabs, nextActive)
      })

      if (nextActive) {
        try {
          await get().switchWorkspace(nextActive)
          restoreSelectionForWorkspace(nextActive)
        } catch (error) {
          appLog(
            'warn',
            'Failed to activate restored workspace',
            error instanceof Error ? error.message : String(error)
          )
        }
      }

      await get().persistWorkspaceSession()
    })()

    return sessionRestorePromise
  },

  reconnectActive: async () => {
    const { activePath } = get()
    if (!activePath) throw new Error('No repository selected')
    await window.gitfreddo.connect(activePath)
    const tabs = updateTab(get().tabs, activePath, {
      connected: true,
      processExited: false,
      connecting: false
    })
    set({ tabs, ...syncLegacyFields(tabs, activePath) })
    appLog('info', 'Reconnected repository', activePath)
  },

  handleProcessExit: (_path) => {
    // Git repos do not use long-lived child processes
  },

  setWorkspacePath: (path) => {
    if (!path) {
      set({ activePath: null, workspacePath: null, connected: false, processExited: false })
      return
    }
    void get().openWorkspace(path)
  },

  setConnected: (connected) => {
    const { activePath, tabs } = get()
    if (!activePath) {
      return
    }
    const nextTabs = updateTab(tabs, activePath, { connected, processExited: !connected })
    set({ tabs: nextTabs, ...syncLegacyFields(nextTabs, activePath) })
  },

  setProcessExited: (processExited) => {
    get().handleProcessExit(get().activePath ?? '')
    if (!processExited && get().activePath) {
      const tabs = updateTab(get().tabs, get().activePath!, {
        processExited: false,
        connected: true
      })
      set({ tabs, ...syncLegacyFields(tabs, get().activePath) })
    }
  }
}))
