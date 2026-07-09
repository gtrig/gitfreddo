import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore, type WorkspaceTab } from '@/stores/workspace'

function tab(path: string): WorkspaceTab {
  return { path, connected: true, connecting: false }
}

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
