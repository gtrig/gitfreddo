/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useInvalidateGit } from './useInvalidateGit'
import { useWorkspaceStore } from '@/stores/workspace'

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useInvalidateGit', () => {
  let queryClient: QueryClient

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    useWorkspaceStore.setState({
      tabs: [{ path: '/repo', connected: true, connecting: false }],
      activePath: '/repo',
      workspacePath: '/repo',
      connected: true
    })
  })

  it('invalidates all repo queries when called without suffixes', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateGit(), {
      wrapper: createWrapper(queryClient)
    })

    act(() => {
      result.current()
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['repo', '/repo'] })
  })

  it('invalidates specific query suffixes for the active repo', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateGit(), {
      wrapper: createWrapper(queryClient)
    })

    act(() => {
      result.current('branch.list', 'working.status')
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['repo', '/repo', 'branch.list'] })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['repo', '/repo', 'working.status'] })
  })

  it('does nothing when no repository is active', () => {
    useWorkspaceStore.setState({
      tabs: [],
      activePath: null,
      workspacePath: null,
      connected: false
    })
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
    const { result } = renderHook(() => useInvalidateGit(), {
      wrapper: createWrapper(queryClient)
    })

    act(() => {
      result.current('branch.list')
    })

    expect(invalidateSpy).not.toHaveBeenCalled()
  })
})
