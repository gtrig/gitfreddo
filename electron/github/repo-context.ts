import { parseGitHubRemote, type GitHubRepoContext } from '../../shared/github'
import type { AppSettings } from '../../shared/ipc'
import { createRepoContextResolver } from '../forge/repo-context'
import { remoteList } from '../git/operations/remote'

export async function listGitHubRepoContexts(
  repoPath: string,
  settings: AppSettings
): Promise<GitHubRepoContext[]> {
  const remotes = await remoteList(repoPath, settings.gitBinaryPath)
  const contexts: GitHubRepoContext[] = []
  const seen = new Set<string>()

  for (const remote of remotes) {
    const parsed = parseGitHubRemote(remote.url)
    if (!parsed) continue
    const key = `${parsed.owner}/${parsed.repo}`
    if (seen.has(key)) continue
    seen.add(key)
    contexts.push(parsed)
  }

  return contexts
}

export const resolveGitHubRepoContext = createRepoContextResolver(
  (url) => parseGitHubRemote(url),
  'GitHub'
)
