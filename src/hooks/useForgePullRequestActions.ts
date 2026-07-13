import { useCallback } from 'react'
import { useInvalidateBitbucketPullRequests } from '@/hooks/useBitbucketPullRequests'
import { useInvalidateGitlabPullRequests } from '@/hooks/useGitlabPullRequests'
import { useForgeContext } from '@/hooks/useForgeContext'
import { useInvalidateGitHubPullRequests } from '@/hooks/useGitHubPullRequests'
import type { ForgeProvider } from '@/lib/forge/detect'

export function useForgePullRequestActions(repoPath: string | null, workspaceConnected: boolean) {
  const forge = useForgeContext(repoPath, workspaceConnected)
  const invalidateGitHub = useInvalidateGitHubPullRequests()
  const invalidateBitbucket = useInvalidateBitbucketPullRequests()
  const invalidateGitlab = useInvalidateGitlabPullRequests()

  const provider = forge.provider
  const canCreatePr = Boolean(provider && forge.connected)

  const submitPullRequest = useCallback(
    async (params: { title: string; body: string; head: string; base: string }) => {
      if (!repoPath || !provider) return
      if (provider === 'bitbucket') {
        await window.gitfreddo.bitbucketCreatePullRequest(repoPath, params)
        await invalidateBitbucket(repoPath)
      } else if (provider === 'gitlab') {
        await window.gitfreddo.gitlabCreatePullRequest(repoPath, params)
        await invalidateGitlab(repoPath)
      } else {
        await window.gitfreddo.githubCreatePullRequest(repoPath, params)
        await invalidateGitHub(repoPath)
      }
    },
    [invalidateBitbucket, invalidateGitlab, invalidateGitHub, provider, repoPath]
  )

  return {
    provider: provider as ForgeProvider | null,
    canCreatePr,
    submitPullRequest
  }
}
