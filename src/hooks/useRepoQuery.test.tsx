/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { useRepoQuery } from './useRepoQuery'
import { useWorkspaceStore } from '@/stores/workspace'

describe('useRepoQuery', () => {
  beforeEach(() => {
    useWorkspaceStore.setState({ activePath: '/repo', connected: true })
    window.gitfreddo = {
      invoke: vi.fn().mockResolvedValue([{ name: 'main' }])
    } as never
  })

  it('invokes the IPC method and returns data when connected', async () => {
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children)

    const { result } = renderHook(
      () => useRepoQuery({ method: 'branch.list' }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.invoke).toHaveBeenCalledWith('branch.list')
    expect(result.current.data).toEqual([{ name: 'main' }])
  })

  it('stays disabled when disconnected', async () => {
    useWorkspaceStore.setState({ connected: false })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } }
    })
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(QueryClientProvider, { client }, children)

    const { result } = renderHook(
      () => useRepoQuery({ method: 'branch.list' }),
      { wrapper }
    )

    expect(result.current.fetchStatus).toBe('idle')
    expect(window.gitfreddo.invoke).not.toHaveBeenCalled()
  })
})
