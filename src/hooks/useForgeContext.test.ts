/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import {
  forgeConnectKey,
  forgeDisplayName,
  forgeNotLinkedKey,
  useForgeContext
} from './useForgeContext'
import { useBitbucketRepoContext } from '@/hooks/useBitbucketRepos'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useRemotes } from '@/hooks/useGit'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'

vi.mock('@/hooks/useGitHubStatus', () => ({ useGitHubStatus: vi.fn() }))
vi.mock('@/hooks/useBitbucketStatus', () => ({ useBitbucketStatus: vi.fn() }))
vi.mock('@/hooks/useGitHubRepos', () => ({ useGitHubRepoContext: vi.fn() }))
vi.mock('@/hooks/useBitbucketRepos', () => ({ useBitbucketRepoContext: vi.fn() }))
vi.mock('@/hooks/useGit', () => ({ useRemotes: vi.fn() }))

const ghCtx = { owner: 'octo', repo: 'hello', host: 'github.com' }
const bbCtx = { workspace: 'acme', owner: 'acme', repo: 'app', host: 'bitbucket.org' }

describe('useForgeContext helpers', () => {
  it('maps forge providers to connect keys', () => {
    expect(forgeConnectKey('github')).toBe('sidebar.connectGitHub')
    expect(forgeConnectKey('bitbucket')).toBe('sidebar.connectBitbucket')
    expect(forgeConnectKey(null)).toBe('sidebar.connectForge')
  })

  it('maps forge providers to not-linked keys', () => {
    expect(forgeNotLinkedKey('github')).toBe('sidebar.notLinkedGitHub')
    expect(forgeNotLinkedKey('bitbucket')).toBe('sidebar.notLinkedBitbucket')
    expect(forgeNotLinkedKey(null)).toBe('sidebar.notLinkedForge')
  })

  it('returns display names for forges', () => {
    expect(forgeDisplayName('github')).toBe('GitHub')
    expect(forgeDisplayName('bitbucket')).toBe('Bitbucket')
    expect(forgeDisplayName(null)).toBe('GitHub')
  })
})

describe('useForgeContext', () => {
  beforeEach(() => {
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: false, login: null, avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubStatus>)
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: false, login: null, avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketStatus>)
    vi.mocked(useGitHubRepoContext).mockReturnValue({
      data: undefined,
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubRepoContext>)
    vi.mocked(useBitbucketRepoContext).mockReturnValue({
      data: undefined,
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketRepoContext>)
    vi.mocked(useRemotes).mockReturnValue({
      data: [],
      isLoading: false
    } as unknown as ReturnType<typeof useRemotes>)
  })

  it('returns bitbucket context when repo is linked to Bitbucket', () => {
    vi.mocked(useBitbucketRepoContext).mockReturnValue({
      data: bbCtx,
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketRepoContext>)
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: true, login: 'bb-user', avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketStatus>)

    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current).toEqual({
      provider: 'bitbucket',
      ctx: bbCtx,
      connected: true,
      login: 'bb-user'
    })
  })

  it('returns github context when repo is linked to GitHub', () => {
    vi.mocked(useGitHubRepoContext).mockReturnValue({
      data: ghCtx,
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubRepoContext>)
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'gh-user', avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubStatus>)

    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current).toEqual({
      provider: 'github',
      ctx: ghCtx,
      connected: true,
      login: 'gh-user'
    })
  })

  it('prefers bitbucket repo context over github when both are present', () => {
    vi.mocked(useBitbucketRepoContext).mockReturnValue({
      data: bbCtx,
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketRepoContext>)
    vi.mocked(useGitHubRepoContext).mockReturnValue({
      data: ghCtx,
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubRepoContext>)

    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current.provider).toBe('bitbucket')
  })

  it('derives expected provider from remotes when repo is not linked', () => {
    vi.mocked(useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'git@github.com:octo/hello.git', fetch: '', push: '' }],
      isLoading: false
    } as unknown as ReturnType<typeof useRemotes>)
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'gh-user', avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useGitHubStatus>)

    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current).toEqual({
      provider: null,
      ctx: null,
      connected: true,
      login: 'gh-user',
      expectedProvider: 'github'
    })
  })

  it('uses bitbucket connection status when expected provider is bitbucket', () => {
    vi.mocked(useRemotes).mockReturnValue({
      data: [{ name: 'origin', url: 'git@bitbucket.org:acme/app.git', fetch: '', push: '' }],
      isLoading: false
    } as unknown as ReturnType<typeof useRemotes>)
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: true, login: 'bb-user', avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as unknown as ReturnType<typeof useBitbucketStatus>)

    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current).toMatchObject({
      provider: null,
      connected: true,
      login: 'bb-user',
      expectedProvider: 'bitbucket'
    })
  })

  it('reports disconnected forge when no remote provider is detected', () => {
    const { result } = renderHook(() => useForgeContext('/tmp/repo', true))

    expect(result.current).toEqual({
      provider: null,
      ctx: null,
      connected: false,
      login: null,
      expectedProvider: null
    })
  })
})
