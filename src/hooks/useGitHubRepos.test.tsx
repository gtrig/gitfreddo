/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useGitHubRepoContext, useGitHubRepos } from './useGitHubRepos'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitHubRepos', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubListRepos).mockResolvedValue([
      { id: 1, name: 'app', fullName: 'acme/app', private: false, htmlUrl: 'https://github.com/acme/app' }
    ] as never)
    vi.mocked(window.gitfreddo.githubGetRepoContext).mockResolvedValue({
      owner: 'acme',
      repo: 'app'
    } as never)
  })

  it('loads repositories for the active search and page', async () => {
    const { result } = renderHook(
      () => useGitHubRepos({ search: 'app', page: 2 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.githubListRepos).toHaveBeenCalledWith({ search: 'app', page: 2 })
    expect(result.current.data?.[0]?.name).toBe('app')
  })

  it('does not fetch when disabled', async () => {
    renderHook(() => useGitHubRepos(undefined, false), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.githubListRepos).not.toHaveBeenCalled()
    })
  })
})

describe('useGitHubRepoContext', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubGetRepoContext).mockResolvedValue({
      owner: 'acme',
      repo: 'app'
    } as never)
  })

  it('loads repo context for the connected path', async () => {
    const { result } = renderHook(() => useGitHubRepoContext('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.githubGetRepoContext).toHaveBeenCalledWith('/repo')
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useGitHubRepoContext(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.githubGetRepoContext).not.toHaveBeenCalled()
    })
  })
})
