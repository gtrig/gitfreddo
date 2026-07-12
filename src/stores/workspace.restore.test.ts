/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

describe('useWorkspaceStore restoreWorkspaceSession', () => {
  beforeEach(() => {
    vi.resetModules()
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.normalizeRepoPath).mockImplementation(async (path) => path)
    vi.mocked(window.gitfreddo.switchWorkspace).mockImplementation(async (path) => path)
  })

  async function loadStore() {
    const mod = await import('@/stores/workspace')
    return mod.useWorkspaceStore
  }

  it('restores saved tabs from settings and connects them', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      openRepoTabs: ['/repo/a', '/repo/b'],
      activeRepoTab: '/repo/b'
    })
    vi.mocked(window.gitfreddo.connect).mockImplementation(async (path) => path)

    const useWorkspaceStore = await loadStore()
    await useWorkspaceStore.getState().restoreWorkspaceSession()

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((tab) => tab.path)).toEqual(['/repo/a', '/repo/b'])
    expect(state.activePath).toBe('/repo/b')
    expect(state.tabs.every((tab) => tab.connected)).toBe(true)
    expect(window.gitfreddo.connect).toHaveBeenCalledWith('/repo/a')
    expect(window.gitfreddo.connect).toHaveBeenCalledWith('/repo/b')
    expect(window.gitfreddo.setSettings).toHaveBeenCalled()
  })

  it('skips restore when tabs are already present', async () => {
    const useWorkspaceStore = await loadStore()
    useWorkspaceStore.setState({
      tabs: [{ path: '/existing', connected: true, connecting: false }],
      activePath: '/existing',
      workspacePath: '/existing',
      connected: true
    })

    await useWorkspaceStore.getState().restoreWorkspaceSession()

    expect(window.gitfreddo.getSettings).not.toHaveBeenCalled()
  })

  it('does nothing when settings have no saved tabs', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      openRepoTabs: [],
      activeRepoTab: null
    })

    const useWorkspaceStore = await loadStore()
    await useWorkspaceStore.getState().restoreWorkspaceSession()

    expect(useWorkspaceStore.getState().tabs).toEqual([])
    expect(window.gitfreddo.connect).not.toHaveBeenCalled()
  })

  it('drops tabs that fail to connect during restore', async () => {
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue({
      ...defaultMockSettings,
      openRepoTabs: ['/repo/good', '/repo/bad'],
      activeRepoTab: '/repo/bad'
    })
    vi.mocked(window.gitfreddo.connect).mockImplementation(async (path) => {
      if (path === '/repo/bad') {
        throw new Error('missing')
      }
      return path
    })

    const useWorkspaceStore = await loadStore()
    await useWorkspaceStore.getState().restoreWorkspaceSession()

    const state = useWorkspaceStore.getState()
    expect(state.tabs.map((tab) => tab.path)).toEqual(['/repo/good'])
    expect(state.activePath).toBe('/repo/good')
  })
})
