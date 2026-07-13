import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  captureBranchVisibilityForWorkspace,
  clearBranchVisibilitySnapshot,
  migrateBranchVisibilitySnapshot,
  restoreBranchVisibilityForWorkspace,
  useBranchVisibilityStore
} from '@/stores/branchVisibility'

function stubLocalStorage() {
  const storage = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      storage.set(key, value)
    },
    removeItem: (key: string) => {
      storage.delete(key)
    },
    clear: () => {
      storage.clear()
    }
  })
  return storage
}

describe('branchVisibility store', () => {
  beforeEach(() => {
    stubLocalStorage()
    useBranchVisibilityStore.setState({ hiddenBranches: new Set() })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('toggles branch visibility', () => {
    useBranchVisibilityStore.getState().toggleBranchVisibility('feature')
    expect(useBranchVisibilityStore.getState().isBranchHidden('feature')).toBe(true)

    useBranchVisibilityStore.getState().toggleBranchVisibility('feature')
    expect(useBranchVisibilityStore.getState().isBranchHidden('feature')).toBe(false)
  })

  it('captures and restores per-workspace hidden branches', () => {
    useBranchVisibilityStore.getState().setBranchVisibility('feature', true)
    captureBranchVisibilityForWorkspace('/repo-a')

    useBranchVisibilityStore.getState().setBranchVisibility('other', true)
    expect(useBranchVisibilityStore.getState().hiddenBranches.has('other')).toBe(true)

    restoreBranchVisibilityForWorkspace('/repo-a')
    expect(useBranchVisibilityStore.getState().hiddenBranches.has('feature')).toBe(true)
    expect(useBranchVisibilityStore.getState().hiddenBranches.has('other')).toBe(false)
  })

  it('persists hidden branches to localStorage for the active repo', () => {
    restoreBranchVisibilityForWorkspace('/repo-a')
    useBranchVisibilityStore.getState().setBranchVisibility('feature', true)

    const stored = JSON.parse(localStorage.getItem('gitfreddo.hiddenBranches') ?? '{}') as Record<
      string,
      string[]
    >
    expect(stored['/repo-a']).toEqual(['feature'])
  })

  it('removes repo entry from storage when all branches are shown again', () => {
    restoreBranchVisibilityForWorkspace('/repo-a')
    useBranchVisibilityStore.getState().setBranchVisibility('feature', true)
    useBranchVisibilityStore.getState().setBranchVisibility('feature', false)

    const stored = JSON.parse(localStorage.getItem('gitfreddo.hiddenBranches') ?? '{}') as Record<
      string,
      string[]
    >
    expect(stored['/repo-a']).toBeUndefined()
  })

  it('ignores corrupt localStorage payloads', () => {
    localStorage.setItem('gitfreddo.hiddenBranches', 'not-json')
    restoreBranchVisibilityForWorkspace('/repo-a')
    expect(useBranchVisibilityStore.getState().hiddenBranches.size).toBe(0)
  })

  it('clears a workspace snapshot from memory and storage', () => {
    restoreBranchVisibilityForWorkspace('/repo-a')
    useBranchVisibilityStore.getState().setBranchVisibility('feature', true)
    clearBranchVisibilitySnapshot('/repo-a')

    restoreBranchVisibilityForWorkspace('/repo-a')
    expect(useBranchVisibilityStore.getState().hiddenBranches.size).toBe(0)
  })

  it('migrates snapshots and storage when a repo path changes', () => {
    restoreBranchVisibilityForWorkspace('/old-path')
    useBranchVisibilityStore.getState().setBranchVisibility('feature', true)
    captureBranchVisibilityForWorkspace('/old-path')

    migrateBranchVisibilitySnapshot('/old-path', '/new-path')
    restoreBranchVisibilityForWorkspace('/new-path')

    expect(useBranchVisibilityStore.getState().isBranchHidden('feature')).toBe(true)
    const stored = JSON.parse(localStorage.getItem('gitfreddo.hiddenBranches') ?? '{}') as Record<
      string,
      string[]
    >
    expect(stored['/new-path']).toEqual(['feature'])
    expect(stored['/old-path']).toBeUndefined()
  })
})
