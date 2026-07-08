import { parseBitbucketRemote } from '../../shared/bitbucket'
import { buildRemoteGetUrlArgs } from '../../shared/git/commands'
import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'
import type { AppSettings } from '../../shared/ipc'

async function contextFromRemote(
  repoPath: string,
  gitBinaryPath: string,
  remoteName: string
): Promise<{ workspace: string; owner: string; repo: string; host: string } | null> {
  const stdout = await runGitOrThrow(buildRemoteGetUrlArgs(remoteName), {
    cwd: repoPath,
    gitBinaryPath
  })
  return parseBitbucketRemote(stdout.trim())
}

export async function resolveBitbucketRepoContext(
  repoPath: string,
  settings: AppSettings,
  remoteName = settings.defaultRemote || 'origin'
): Promise<{ workspace: string; owner: string; repo: string; host: string }> {
  const gitBinaryPath = settings.gitBinaryPath

  const resolved = await resolveRemoteName(repoPath, gitBinaryPath, remoteName)
  const parsed = await contextFromRemote(repoPath, gitBinaryPath, resolved)
  if (parsed) {
    return parsed
  }

  const remotes = await remoteList(repoPath, gitBinaryPath)
  for (const remote of remotes) {
    const candidate = parseBitbucketRemote(remote.url)
    if (candidate) {
      return candidate
    }
  }

  throw new Error(
    `Remote "${resolved}" is not a Bitbucket repository and no other Bitbucket remote was found`
  )
}
