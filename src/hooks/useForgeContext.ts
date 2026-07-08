import { useMemo } from 'react'
import { useBitbucketRepoContext } from '@/hooks/useBitbucketRepos'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useRemotes } from '@/hooks/useGit'
import { useGitHubRepoContext } from '@/hooks/useGitHubRepos'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'
import { detectForgeFromRemote } from '@/lib/forge/detect'
import type { BitbucketRepoContext } from '@shared/bitbucket'
import type { GitHubRepoContext } from '@shared/github'
import type { ForgeProvider } from '@/lib/forge/detect'

export type ForgeContext =
  | { provider: 'github'; ctx: GitHubRepoContext; connected: boolean; login: string | null }
  | { provider: 'bitbucket'; ctx: BitbucketRepoContext; connected: boolean; login: string | null }
  | {
      provider: ForgeProvider | null
      ctx: null
      connected: boolean
      login: string | null
      expectedProvider: ForgeProvider | null
    }

export function useForgeContext(repoPath: string | null, workspaceConnected: boolean): ForgeContext {
  const { data: ghStatus } = useGitHubStatus()
  const { data: bbStatus } = useBitbucketStatus()
  const { data: ghCtx } = useGitHubRepoContext(repoPath, workspaceConnected)
  const { data: bbCtx } = useBitbucketRepoContext(repoPath, workspaceConnected)
  const { data: remotes } = useRemotes(workspaceConnected)

  const expectedProvider = useMemo(() => {
    for (const remote of remotes ?? []) {
      const provider = detectForgeFromRemote(remote.url)
      if (provider) return provider
    }
    return null
  }, [remotes])

  return useMemo(() => {
    if (bbCtx) {
      return {
        provider: 'bitbucket' as const,
        ctx: bbCtx,
        connected: Boolean(bbStatus?.connected),
        login: bbStatus?.login ?? null
      }
    }
    if (ghCtx) {
      return {
        provider: 'github' as const,
        ctx: ghCtx,
        connected: Boolean(ghStatus?.connected),
        login: ghStatus?.login ?? null
      }
    }
    const provider = expectedProvider
    const connected =
      provider === 'bitbucket'
        ? Boolean(bbStatus?.connected)
        : provider === 'github'
          ? Boolean(ghStatus?.connected)
          : false
    const login =
      provider === 'bitbucket'
        ? (bbStatus?.login ?? null)
        : provider === 'github'
          ? (ghStatus?.login ?? null)
          : null
    return { provider: null, ctx: null, connected, login, expectedProvider: provider }
  }, [
    bbCtx,
    ghCtx,
    bbStatus?.connected,
    bbStatus?.login,
    ghStatus?.connected,
    ghStatus?.login,
    expectedProvider
  ])
}

export function forgeConnectKey(provider: ForgeProvider | null): string {
  if (provider === 'bitbucket') return 'sidebar.connectBitbucket'
  if (provider === 'github') return 'sidebar.connectGitHub'
  return 'sidebar.connectForge'
}

export function forgeNotLinkedKey(provider: ForgeProvider | null): string {
  if (provider === 'bitbucket') return 'sidebar.notLinkedBitbucket'
  if (provider === 'github') return 'sidebar.notLinkedGitHub'
  return 'sidebar.notLinkedForge'
}

export function forgeDisplayName(provider: ForgeProvider | null): string {
  if (provider === 'bitbucket') return 'Bitbucket'
  return 'GitHub'
}
