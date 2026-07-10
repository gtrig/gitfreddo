import { parseGitHubRemote, type GitHubRepoContext } from '../../shared/github'
import { buildRemoteGetUrlArgs } from '../../shared/git/commands'
import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'
import type { AppSettings } from '../../shared/ipc'

async function contextFromRemote(
  repoPath: string,
  gitBinaryPath: string,
  remoteName: string
): Promise<{ owner: string; repo: string; host: string } | null> {
  const stdout = await runGitOrThrow(buildRemoteGetUrlArgs(remoteName), {
    cwd: repoPath,
    gitBinaryPath
  })
  return parseGitHubRemote(stdout.trim())
}

export async function listGitHubRepoContexts(
  repoPath: string,
  settings: AppSettings
): Promise<GitHubRepoContext[]> {
  const gitBinaryPath = settings.gitBinaryPath
  const remotes = await remoteList(repoPath, gitBinaryPath)
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

export async function resolveGitHubRepoContext(
  repoPath: string,
  settings: AppSettings,
  remoteName = settings.defaultRemote || 'origin'
): Promise<{ owner: string; repo: string; host: string }> {
  const gitBinaryPath = settings.gitBinaryPath

  const resolved = await resolveRemoteName(repoPath, gitBinaryPath, remoteName)
  const parsed = await contextFromRemote(repoPath, gitBinaryPath, resolved)
  if (parsed) {
    return parsed
  }

  const remotes = await remoteList(repoPath, gitBinaryPath)
  for (const remote of remotes) {
    const candidate = parseGitHubRemote(remote.url)
    if (candidate) {
      return candidate
    }
  }

  throw new Error(
    `Remote "${resolved}" is not a GitHub repository and no other GitHub remote was found`
  )
}
