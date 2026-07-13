import { parseBitbucketRemote } from '@shared/bitbucket'
import { parseGitHubRemote } from '@shared/github'
import { parseGitlabRemote } from '@shared/gitlab'

export type ForgeProvider = 'github' | 'bitbucket' | 'gitlab'

export function detectForgeFromRemote(url: string): ForgeProvider | null {
  if (parseBitbucketRemote(url)) return 'bitbucket'
  if (parseGitlabRemote(url)) return 'gitlab'
  if (parseGitHubRemote(url)) return 'github'
  return null
}

export async function detectForgeFromContext(repoPath: string): Promise<ForgeProvider | null> {
  const [githubCtx, bitbucketCtx, gitlabCtx] = await Promise.all([
    window.gitfreddo.githubGetRepoContext(repoPath),
    window.gitfreddo.bitbucketGetRepoContext(repoPath),
    window.gitfreddo.gitlabGetRepoContext(repoPath)
  ])
  if (bitbucketCtx) return 'bitbucket'
  if (gitlabCtx) return 'gitlab'
  if (githubCtx) return 'github'
  return null
}
