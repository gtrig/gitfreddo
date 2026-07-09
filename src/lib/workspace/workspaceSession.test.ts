import { describe, expect, it } from 'vitest'
import {
  orderPathsForRestore,
  reorderTabPaths,
  snapshotFromSettings,
  workspaceSessionKey
} from './workspaceSession'

describe('workspaceSessionKey', () => {
  it('changes when tab order changes', () => {
    const a = workspaceSessionKey({ tabPaths: ['/a', '/b'], activePath: '/a' })
    const b = workspaceSessionKey({ tabPaths: ['/b', '/a'], activePath: '/a' })
    expect(a).not.toBe(b)
  })
})

describe('snapshotFromSettings', () => {
  it('prefers repo tab fields and falls back to legacy workspace fields', () => {
    expect(
      snapshotFromSettings({
        openRepoTabs: ['/a'],
        activeRepoTab: '/a'
      })
    ).toEqual({ tabPaths: ['/a'], activePath: '/a' })

    expect(
      snapshotFromSettings({
        openWorkspaceTabs: ['/legacy'],
        activeWorkspaceTab: '/legacy'
      })
    ).toEqual({ tabPaths: ['/legacy'], activePath: '/legacy' })
  })
})

describe('reorderTabPaths', () => {
  it('moves a tab to a new index', () => {
    expect(reorderTabPaths(['/a', '/b', '/c'], 0, 2)).toEqual(['/b', '/c', '/a'])
    expect(reorderTabPaths(['/a', '/b', '/c'], 2, 0)).toEqual(['/c', '/a', '/b'])
  })

  it('returns the same array for no-op moves', () => {
    const paths = ['/a', '/b']
    expect(reorderTabPaths(paths, 0, 0)).toBe(paths)
    expect(reorderTabPaths(paths, -1, 1)).toBe(paths)
    expect(reorderTabPaths(paths, 0, 5)).toBe(paths)
  })
})

describe('orderPathsForRestore', () => {
  it('connects active tab last', () => {
    const { connectOrder, activePath } = orderPathsForRestore(['/a', '/b', '/c'], '/b')
    expect(activePath).toBe('/b')
    expect(connectOrder).toEqual(['/a', '/c', '/b'])
  })

  it('falls back to first tab when active is missing', () => {
    const { connectOrder, activePath } = orderPathsForRestore(['/a', '/b'], null)
    expect(activePath).toBe('/a')
    expect(connectOrder).toEqual(['/b', '/a'])
  })
})
