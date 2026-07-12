/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useWorkspaceSessionPersistence } from './useWorkspaceSessionPersistence'
import { useWorkspaceStore } from '@/stores/workspace'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

describe('useWorkspaceSessionPersistence', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      connected: false,
      workspacePath: null,
      workspacePickerOpen: false
    })
  })

  it('restores workspace session on mount', () => {
    const restore = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ restoreWorkspaceSession: restore })

    renderHook(() => useWorkspaceSessionPersistence())
    expect(restore).toHaveBeenCalled()
  })

  it('persists when tabs change', () => {
    const persist = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ persistWorkspaceSession: persist })

    renderHook(() => useWorkspaceSessionPersistence())
    persist.mockClear()

    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo'
    })

    expect(persist).toHaveBeenCalled()
  })

  it('persists on beforeunload', () => {
    const persist = vi.fn(async () => undefined)
    useWorkspaceStore.setState({ persistWorkspaceSession: persist })

    renderHook(() => useWorkspaceSessionPersistence())
    persist.mockClear()

    window.dispatchEvent(new Event('beforeunload'))
    expect(persist).toHaveBeenCalled()
  })
})
