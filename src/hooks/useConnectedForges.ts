import { useMemo } from 'react'
import { getConnectedForges } from '@/lib/forge/connected'
import type { ForgeProvider } from '@/lib/forge/detect'
import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useGitlabStatus } from '@/hooks/useGitlabStatus'
import { useGitHubStatus } from '@/hooks/useGitHubStatus'

export function useConnectedForges(): ForgeProvider[] {
  const { data: github } = useGitHubStatus()
  const { data: bitbucket } = useBitbucketStatus()
  const { data: gitlab } = useGitlabStatus()

  return useMemo(
    () =>
      getConnectedForges({
        github,
        bitbucket,
        gitlab
      }),
    [github, bitbucket, gitlab]
  )
}
