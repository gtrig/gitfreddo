import { parseBitbucketRemote } from '@shared/bitbucket'
import { parseGitHubRemote } from '@shared/github'

export type ForgeProvider = 'github' | 'bitbucket'

export function detectForgeFromRemote(url: string): ForgeProvider | null {
  if (parseBitbucketRemote(url)) return 'bitbucket'
  if (parseGitHubRemote(url)) return 'github'
  return null
}

export async function detectForgeFromContext(repoPath: string): Promise<ForgeProvider | null> {
  const [githubCtx, bitbucketCtx] = await Promise.all([
    window.gitfreddo.githubGetRepoContext(repoPath),
    window.gitfreddo.bitbucketGetRepoContext(repoPath)
  ])
  if (bitbucketCtx) return 'bitbucket'
  if (githubCtx) return 'github'
  return null
}
