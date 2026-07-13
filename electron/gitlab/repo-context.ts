import { parseGitlabRemote } from '../../shared/gitlab'
import { buildRemoteGetUrlArgs } from '../../shared/git/commands'
import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'
import type { AppSettings } from '../../shared/ipc'

async function contextFromRemote(
  repoPath: string,
  gitBinaryPath: string,
  remoteName: string,
  configuredHost?: string | null
): Promise<{ namespace: string; owner: string; repo: string; host: string } | null> {
  const stdout = await runGitOrThrow(buildRemoteGetUrlArgs(remoteName), {
    cwd: repoPath,
    gitBinaryPath
  })
  return parseGitlabRemote(stdout.trim(), configuredHost)
}

export async function resolveGitlabRepoContext(
  repoPath: string,
  settings: AppSettings,
  remoteName = settings.defaultRemote || 'origin'
): Promise<{ namespace: string; owner: string; repo: string; host: string }> {
  const gitBinaryPath = settings.gitBinaryPath
  const configuredHost = settings.gitlabHost

  const resolved = await resolveRemoteName(repoPath, gitBinaryPath, remoteName)
  const parsed = await contextFromRemote(repoPath, gitBinaryPath, resolved, configuredHost)
  if (parsed) {
    return parsed
  }

  const remotes = await remoteList(repoPath, gitBinaryPath)
  for (const remote of remotes) {
    const candidate = parseGitlabRemote(remote.url, configuredHost)
    if (candidate) {
      return candidate
    }
  }

  throw new Error(
    `Remote "${resolved}" is not a GitLab repository and no other GitLab remote was found`
  )
}
