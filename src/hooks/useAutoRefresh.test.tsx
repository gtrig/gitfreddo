/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAutoRefresh, useManualRefresh } from './useAutoRefresh'
import { useWorkspaceStore } from '@/stores/workspace'
import { REPO_CHANGE_REFS_QUERY_SUFFIXES } from '@shared/repo-change'

vi.mock('./useAppSettings', () => ({
  usePollIntervalMs: vi.fn(() => 1000)
}))

describe('useAutoRefresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    useWorkspaceStore.setState({
      connected: true,
      activePath: '/tmp/repo',
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('invalidates repo queries on the poll interval', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useAutoRefresh(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    })

    act(() => {
      vi.advanceTimersByTime(1000)
    })

    for (const suffix of REPO_CHANGE_REFS_QUERY_SUFFIXES) {
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['repo', '/tmp/repo', suffix] })
    }
  })

  it('does not poll when disconnected', () => {
    useWorkspaceStore.setState({ connected: false })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    renderHook(() => useAutoRefresh(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    })

    act(() => {
      vi.advanceTimersByTime(5000)
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})

describe('useManualRefresh', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({
      connected: false,
      activePath: null,
      tabs: [],
      workspacePath: null,
      workspacePickerOpen: false
    })
  })

  it('invalidates queries for the active repository', () => {
    useWorkspaceStore.setState({
      connected: true,
      activePath: '/tmp/repo',
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useManualRefresh(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    })

    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['repo', '/tmp/repo'] })
  })

  it('invalidates all queries when no repo is active', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')

    const { result } = renderHook(() => useManualRefresh(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      )
    })

    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalled()
    expect(invalidateSpy.mock.calls[0]?.[0]).toBeUndefined()
  })
})
