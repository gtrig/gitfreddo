/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useForgePullRequestActions } from './useForgePullRequestActions'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const invalidateGitHub = vi.fn(async () => undefined)
const invalidateBitbucket = vi.fn(async () => undefined)

vi.mock('@/hooks/useForgeContext', () => ({
  useForgeContext: vi.fn()
}))

vi.mock('@/hooks/useGitHubPullRequests', () => ({
  useInvalidateGitHubPullRequests: () => invalidateGitHub
}))

vi.mock('@/hooks/useBitbucketPullRequests', () => ({
  useInvalidateBitbucketPullRequests: () => invalidateBitbucket
}))

import { useForgeContext } from '@/hooks/useForgeContext'

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

describe('useForgePullRequestActions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.githubCreatePullRequest).mockResolvedValue({ number: 1 } as never)
    vi.mocked(window.gitfreddo.bitbucketCreatePullRequest).mockResolvedValue({ id: 2 } as never)
  })

  it('creates a GitHub pull request and invalidates GitHub queries', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'github',
      connected: true
    } as never)

    const { result } = renderHook(
      () => useForgePullRequestActions('/repo', true),
      { wrapper }
    )

    expect(result.current.canCreatePr).toBe(true)
    await act(async () => {
      await result.current.submitPullRequest({
        title: 'Feature',
        body: 'Details',
        head: 'feature',
        base: 'main'
      })
    })

    expect(window.gitfreddo.githubCreatePullRequest).toHaveBeenCalledWith('/repo', {
      title: 'Feature',
      body: 'Details',
      head: 'feature',
      base: 'main'
    })
    expect(invalidateGitHub).toHaveBeenCalledWith('/repo')
  })

  it('creates a Bitbucket pull request and invalidates Bitbucket queries', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: 'bitbucket',
      connected: true
    } as never)

    const { result } = renderHook(
      () => useForgePullRequestActions('/repo', true),
      { wrapper }
    )

    await act(async () => {
      await result.current.submitPullRequest({
        title: 'Feature',
        body: 'Details',
        head: 'feature',
        base: 'main'
      })
    })

    expect(window.gitfreddo.bitbucketCreatePullRequest).toHaveBeenCalledWith('/repo', {
      title: 'Feature',
      body: 'Details',
      head: 'feature',
      base: 'main'
    })
    expect(invalidateBitbucket).toHaveBeenCalledWith('/repo')
  })

  it('does nothing when forge is disconnected', async () => {
    vi.mocked(useForgeContext).mockReturnValue({
      provider: null,
      connected: false
    } as never)

    const { result } = renderHook(
      () => useForgePullRequestActions('/repo', false),
      { wrapper }
    )

    expect(result.current.canCreatePr).toBe(false)
    await act(async () => {
      await result.current.submitPullRequest({
        title: 'Feature',
        body: '',
        head: 'feature',
        base: 'main'
      })
    })

    expect(window.gitfreddo.githubCreatePullRequest).not.toHaveBeenCalled()
    expect(window.gitfreddo.bitbucketCreatePullRequest).not.toHaveBeenCalled()
  })
})
