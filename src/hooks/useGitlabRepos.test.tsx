/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useGitlabNamespaces,
  useGitlabRepoContext,
  useGitlabRepos
} from './useGitlabRepos'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useGitlabRepos', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.gitlabListRepos).mockResolvedValue([
      { id: 1, name: 'app', fullName: 'acme/app', namespace: 'acme', private: true }
    ] as never)
    vi.mocked(window.gitfreddo.gitlabListNamespaces).mockResolvedValue(['acme'])
    vi.mocked(window.gitfreddo.gitlabGetRepoContext).mockResolvedValue({
      namespace: 'acme',
      repo: 'app'
    } as never)
  })

  it('loads repositories for the active search and page', async () => {
    const { result } = renderHook(
      () => useGitlabRepos({ search: 'app', page: 2 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.gitlabListRepos).toHaveBeenCalledWith({ search: 'app', page: 2 })
    expect(result.current.data).toHaveLength(1)
  })

  it('does not fetch when disabled', async () => {
    renderHook(() => useGitlabRepos(undefined, false), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.gitlabListRepos).not.toHaveBeenCalled()
    })
  })
})

describe('useGitlabNamespaces', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.gitlabListNamespaces).mockResolvedValue(['acme'])
  })

  it('loads namespace slugs', async () => {
    const { result } = renderHook(() => useGitlabNamespaces(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(['acme'])
  })
})

describe('useGitlabRepoContext', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.gitlabGetRepoContext).mockResolvedValue({
      namespace: 'acme',
      repo: 'app'
    } as never)
  })

  it('loads repo context for the connected path', async () => {
    const { result } = renderHook(() => useGitlabRepoContext('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.gitlabGetRepoContext).toHaveBeenCalledWith('/repo')
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useGitlabRepoContext(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.gitlabGetRepoContext).not.toHaveBeenCalled()
    })
  })
})
