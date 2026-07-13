/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useBitbucketRepoContext,
  useBitbucketRepos,
  useBitbucketWorkspaces
} from './useBitbucketRepos'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useBitbucketRepos', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketListRepos).mockResolvedValue([
      { uuid: '1', name: 'app', slug: 'app', fullName: 'acme/app', isPrivate: true }
    ] as never)
    vi.mocked(window.gitfreddo.bitbucketListWorkspaces).mockResolvedValue(['acme'])
    vi.mocked(window.gitfreddo.bitbucketGetRepoContext).mockResolvedValue({
      workspace: 'acme',
      slug: 'app'
    } as never)
  })

  it('loads repositories for the active search and page', async () => {
    const { result } = renderHook(
      () => useBitbucketRepos({ search: 'app', page: 2 }),
      { wrapper }
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.bitbucketListRepos).toHaveBeenCalledWith({ search: 'app', page: 2 })
    expect(result.current.data).toHaveLength(1)
  })

  it('does not fetch when disabled', async () => {
    renderHook(() => useBitbucketRepos(undefined, false), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.bitbucketListRepos).not.toHaveBeenCalled()
    })
  })
})

describe('useBitbucketWorkspaces', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketListWorkspaces).mockResolvedValue(['acme'])
  })

  it('loads workspace slugs', async () => {
    const { result } = renderHook(() => useBitbucketWorkspaces(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual(['acme'])
  })
})

describe('useBitbucketRepoContext', () => {
  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.bitbucketGetRepoContext).mockResolvedValue({
      workspace: 'acme',
      slug: 'app'
    } as never)
  })

  it('loads repo context for the connected path', async () => {
    const { result } = renderHook(() => useBitbucketRepoContext('/repo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(window.gitfreddo.bitbucketGetRepoContext).toHaveBeenCalledWith('/repo')
  })

  it('stays idle without a repo path', async () => {
    renderHook(() => useBitbucketRepoContext(null), { wrapper })
    await waitFor(() => {
      expect(window.gitfreddo.bitbucketGetRepoContext).not.toHaveBeenCalled()
    })
  })
})
