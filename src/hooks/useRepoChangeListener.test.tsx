/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useRepoChangeListener } from './useRepoChangeListener'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import type { RepoChangeEvent } from '@shared/repo-change'

vi.mock('@/lib/git/repoChange', () => ({
  shouldHandleRepoChangeEvent: vi.fn(() => true),
  invalidateRepoChange: vi.fn()
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe('useRepoChangeListener', () => {
  beforeEach(async () => {
    window.gitfreddo = createGitFreddoMock()
    const repoChange = await import('@/lib/git/repoChange')
    vi.mocked(repoChange.shouldHandleRepoChangeEvent).mockReturnValue(true)
    vi.mocked(repoChange.invalidateRepoChange).mockClear()
  })

  it('subscribes to repo change events and invalidates queries', async () => {
    const queryClient = new QueryClient()
    let handler: ((event: RepoChangeEvent) => void) | undefined
    vi.mocked(window.gitfreddo.onRepoChanged).mockImplementation((callback) => {
      handler = callback
      return () => undefined
    })

    renderHook(() => useRepoChangeListener(), { wrapper: createWrapper(queryClient) })

    const repoChange = await import('@/lib/git/repoChange')
    handler?.({ repoPath: '/tmp/repo', scope: 'working' })
    expect(repoChange.invalidateRepoChange).toHaveBeenCalled()
  })

  it('ignores events when shouldHandleRepoChangeEvent returns false', async () => {
    const queryClient = new QueryClient()
    const repoChange = await import('@/lib/git/repoChange')
    vi.mocked(repoChange.shouldHandleRepoChangeEvent).mockReturnValue(false)

    let handler: ((event: RepoChangeEvent) => void) | undefined
    vi.mocked(window.gitfreddo.onRepoChanged).mockImplementation((callback) => {
      handler = callback
      return () => undefined
    })

    renderHook(() => useRepoChangeListener(), { wrapper: createWrapper(queryClient) })
    handler?.({ repoPath: '/tmp/repo', scope: 'working' })
    expect(repoChange.invalidateRepoChange).not.toHaveBeenCalled()
  })
})
