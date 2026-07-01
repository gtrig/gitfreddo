import { parseGitHubRemote } from '../../shared/github'
import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'
import type { AppSettings } from '../../shared/ipc'

async function contextFromRemote(
  repoPath: string,
  gitBinaryPath: string,
  remoteName: string
): Promise<{ owner: string; repo: string; host: string } | null> {
  const stdout = await runGitOrThrow(['remote', 'get-url', remoteName], {
    cwd: repoPath,
    gitBinaryPath
  })
  return parseGitHubRemote(stdout.trim())
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
