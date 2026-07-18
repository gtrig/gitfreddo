/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore, workspaceTabLabel, type WorkspaceTab } from '@/stores/workspace'

function tab(path: string, connected = true, connecting = false): WorkspaceTab {
  return { path, connected, connecting }
}

function resetWorkspaceStore() {
  useWorkspaceStore.setState({
    tabs: [],
    activePath: null,
    workspacePickerOpen: false,
    workspacePath: null,
    connected: false,
    prDetailNumber: null,
    prDetailRepository: null
  })
}

describe('workspaceTabLabel', () => {
  it('returns the last path segment', () => {
    expect(workspaceTabLabel('/home/user/my-repo')).toBe('my-repo')
    expect(workspaceTabLabel('C:\\Users\\dev\\project\\')).toBe('project')
  })

  it('returns the original path when empty segments remain', () => {
    expect(workspaceTabLabel('/')).toBe('/')
  })
})

describe('useWorkspaceStore openWorkspace', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    resetWorkspaceStore()
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockImplementation(async (path) => path)
    vi.mocked(window.gitfreddo.switchWorkspace).mockImplementation(async (path) => path)
  })

  it('opens a new workspace tab and connects', async () => {
    vi.mocked(window.gitfreddo.connect).mockResolvedValue('/repo/a')

    await useWorkspaceStore.getState().openWorkspace('/repo/a')

    const state = useWorkspaceStore.getState()
    expect(state.tabs).toEqual([tab('/repo/a')])
    expect(state.activePath).toBe('/repo/a')
    expect(state.connected).toBe(true)
    expect(window.gitfreddo.connect).toHaveBeenCalledWith('/repo/a')
  })

  it('remaps the tab path when connect returns a canonical path', async () => {
    vi.mocked(window.gitfreddo.connect).mockResolvedValue('/canonical/repo')

    await useWorkspaceStore.getState().openWorkspace('/symlink/repo')

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((item) => item.path)).toEqual(['/canonical/repo'])
    expect(state.activePath).toBe('/canonical/repo')
  })

  it('switches to an existing tab instead of opening a duplicate', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/repo/a'), tab('/repo/b')],
      activePath: '/repo/a',
      workspacePath: '/repo/a',
      connected: true
    })

    await useWorkspaceStore.getState().openWorkspace('/repo/b')

    expect(useWorkspaceStore.getState().activePath).toBe('/repo/b')
    expect(useWorkspaceStore.getState().tabs).toHaveLength(2)
    expect(window.gitfreddo.connect).not.toHaveBeenCalled()
    expect(window.gitfreddo.switchWorkspace).toHaveBeenCalledWith('/repo/b')
  })

  it('removes the tab and rethrows when connect fails', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/repo/keep')],
      activePath: '/repo/keep',
      workspacePath: '/repo/keep',
      connected: true
    })
    vi.mocked(window.gitfreddo.connect).mockRejectedValue(new Error('not a git repo'))

    await expect(useWorkspaceStore.getState().openWorkspace('/repo/fail')).rejects.toThrow(
      'not a git repo'
    )

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((item) => item.path)).toEqual(['/repo/keep'])
    expect(state.activePath).toBe('/repo/keep')
  })
})

describe('useWorkspaceStore switchWorkspace', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    resetWorkspaceStore()
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockImplementation(async (path) => path)
    vi.mocked(window.gitfreddo.switchWorkspace).mockImplementation(async (path) => path)
  })

  it('switches the active tab and marks it connected', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b', false)],
      activePath: '/a',
      workspacePath: '/a',
      connected: true,
      prDetailNumber: 7,
      prDetailRepository: { owner: 'acme', repo: 'app' }
    })
    const { useCommitSearchStore } = await import('@/stores/commitSearch')
    useCommitSearchStore.setState({ open: true, query: 'old-repo' })

    await useWorkspaceStore.getState().switchWorkspace('/b')

    const state = useWorkspaceStore.getState()
    expect(state.activePath).toBe('/b')
    expect(state.connected).toBe(true)
    expect(state.tabs.find((item) => item.path === '/b')?.connected).toBe(true)
    expect(state.prDetailNumber).toBeNull()
    expect(state.prDetailRepository).toBeNull()
    expect(useCommitSearchStore.getState().open).toBe(false)
    expect(useCommitSearchStore.getState().query).toBe('')
    expect(window.gitfreddo.switchWorkspace).toHaveBeenCalledWith('/b')
  })

  it('is a no-op when the tab is already active', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a')],
      activePath: '/a',
      workspacePath: '/a',
      connected: true
    })

    await useWorkspaceStore.getState().switchWorkspace('/a')

    expect(window.gitfreddo.switchWorkspace).not.toHaveBeenCalled()
  })

  it('throws when the tab does not exist', async () => {
    await expect(useWorkspaceStore.getState().switchWorkspace('/missing')).rejects.toThrow(
      'Workspace tab not found'
    )
  })

  it('falls back to connect when switchWorkspace fails', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b', false)],
      activePath: '/a',
      workspacePath: '/a',
      connected: true
    })
    vi.mocked(window.gitfreddo.switchWorkspace).mockRejectedValue(new Error('not loaded'))
    vi.mocked(window.gitfreddo.connect).mockResolvedValue('/b')

    await useWorkspaceStore.getState().switchWorkspace('/b')

    expect(window.gitfreddo.connect).toHaveBeenCalledWith('/b')
    expect(useWorkspaceStore.getState().activePath).toBe('/b')
  })
})

describe('useWorkspaceStore closeWorkspace', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    resetWorkspaceStore()
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockImplementation(async (path) => path)
    vi.mocked(window.gitfreddo.switchWorkspace).mockImplementation(async (path) => path)
  })

  it('closes an inactive tab without changing the active path', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b')],
      activePath: '/a',
      workspacePath: '/a',
      connected: true
    })

    await useWorkspaceStore.getState().closeWorkspace('/b')

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((item) => item.path)).toEqual(['/a'])
    expect(state.activePath).toBe('/a')
    expect(window.gitfreddo.disconnectWorkspace).toHaveBeenCalledWith('/b')
    expect(window.gitfreddo.switchWorkspace).not.toHaveBeenCalled()
  })

  it('activates the neighbor when closing the active tab', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b'), tab('/c')],
      activePath: '/b',
      workspacePath: '/b',
      connected: true
    })

    await useWorkspaceStore.getState().closeWorkspace('/b')

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((item) => item.path)).toEqual(['/a', '/c'])
    expect(state.activePath).toBe('/c')
    expect(window.gitfreddo.switchWorkspace).toHaveBeenCalledWith('/c')
  })

  it('clears active path when closing the last tab', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/only')],
      activePath: '/only',
      workspacePath: '/only',
      connected: true
    })

    await useWorkspaceStore.getState().closeWorkspace('/only')

    const state = useWorkspaceStore.getState()
    expect(state.tabs).toEqual([])
    expect(state.activePath).toBeNull()
    expect(state.connected).toBe(false)
  })
})

describe('useWorkspaceStore picker and PR detail', () => {
  beforeEach(() => {
    resetWorkspaceStore()
  })

  it('opens and closes the workspace picker', () => {
    useWorkspaceStore.getState().openWorkspacePicker()
    expect(useWorkspaceStore.getState().workspacePickerOpen).toBe(true)

    useWorkspaceStore.getState().closeWorkspacePicker()
    expect(useWorkspaceStore.getState().workspacePickerOpen).toBe(false)
  })

  it('openWorkspaceDialog delegates to openWorkspacePicker', () => {
    useWorkspaceStore.getState().openWorkspaceDialog()
    expect(useWorkspaceStore.getState().workspacePickerOpen).toBe(true)
  })

  it('opens and closes PR detail state', () => {
    useWorkspaceStore.getState().openPrDetail({
      number: 42,
      repository: { owner: 'acme', repo: 'app' }
    })
    expect(useWorkspaceStore.getState().prDetailNumber).toBe(42)
    expect(useWorkspaceStore.getState().prDetailRepository).toEqual({ owner: 'acme', repo: 'app' })

    useWorkspaceStore.getState().closePrDetail()
    expect(useWorkspaceStore.getState().prDetailNumber).toBeNull()
    expect(useWorkspaceStore.getState().prDetailRepository).toBeNull()
  })
})

describe('useWorkspaceStore persistWorkspaceSession', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    resetWorkspaceStore()
  })

  it('persists open tabs and active path to settings', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b')],
      activePath: '/b',
      workspacePath: '/b',
      connected: true
    })

    await useWorkspaceStore.getState().persistWorkspaceSession()

    expect(window.gitfreddo.setSettings).toHaveBeenCalledWith({
      openRepoTabs: ['/a', '/b'],
      activeRepoTab: '/b'
    })
  })
})

describe('useWorkspaceStore reconnectActive', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    resetWorkspaceStore()
  })

  it('reconnects the active repository', async () => {
    useWorkspaceStore.setState({
      tabs: [tab('/repo', false)],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: false
    })
    vi.mocked(window.gitfreddo.connect).mockResolvedValue('/repo')

    await useWorkspaceStore.getState().reconnectActive()

    expect(window.gitfreddo.connect).toHaveBeenCalledWith('/repo')
    expect(useWorkspaceStore.getState().connected).toBe(true)
  })

  it('throws when no repository is active', async () => {
    await expect(useWorkspaceStore.getState().reconnectActive()).rejects.toThrow(
      'No repository selected'
    )
  })
})

describe('useWorkspaceStore reorderWorkspaceTabs', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [tab('/a'), tab('/b'), tab('/c')],
      activePath: '/b',
      workspacePath: '/b',
      connected: true,
      workspacePickerOpen: false
    })
  })

  it('reorders tabs without changing the active path', () => {
    useWorkspaceStore.getState().reorderWorkspaceTabs(0, 2)
    expect(useWorkspaceStore.getState().tabs.map((item) => item.path)).toEqual([
      '/b',
      '/c',
      '/a'
    ])
    expect(useWorkspaceStore.getState().activePath).toBe('/b')
  })

  it('ignores invalid indices', () => {
    useWorkspaceStore.getState().reorderWorkspaceTabs(0, 0)
    expect(useWorkspaceStore.getState().tabs.map((item) => item.path)).toEqual([
      '/a',
      '/b',
      '/c'
    ])
  })
})

describe('useWorkspaceStore PR detail and connection helpers', () => {
  beforeEach(() => resetWorkspaceStore())

  it('opens and closes pull request detail state', () => {
    useWorkspaceStore.getState().openPrDetail({
      number: 42,
      repository: { owner: 'acme', repo: 'app' }
    })
    expect(useWorkspaceStore.getState().prDetailNumber).toBe(42)
    expect(useWorkspaceStore.getState().prDetailRepository).toEqual({ owner: 'acme', repo: 'app' })

    useWorkspaceStore.getState().closePrDetail()
    expect(useWorkspaceStore.getState().prDetailNumber).toBeNull()
    expect(useWorkspaceStore.getState().prDetailRepository).toBeNull()
  })

  it('clears workspace path when set to null', () => {
    useWorkspaceStore.setState({
      tabs: [tab('/repo')],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })

    useWorkspaceStore.getState().setWorkspacePath(null)
    expect(useWorkspaceStore.getState().activePath).toBeNull()
    expect(useWorkspaceStore.getState().connected).toBe(false)
  })

  it('updates connected state for the active tab', () => {
    useWorkspaceStore.setState({
      tabs: [tab('/repo', true)],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })

    useWorkspaceStore.getState().setConnected(false)
    expect(useWorkspaceStore.getState().connected).toBe(false)
    expect(useWorkspaceStore.getState().tabs[0]?.connected).toBe(false)
  })

  it('ignores setConnected when there is no active path', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      workspacePath: null,
      connected: false
    })

    useWorkspaceStore.getState().setConnected(true)
    expect(useWorkspaceStore.getState().connected).toBe(false)
  })
})
