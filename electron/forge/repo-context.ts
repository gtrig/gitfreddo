import { buildRemoteGetUrlArgs } from '../../shared/git/commands'
import type { AppSettings } from '../../shared/ipc'
import { runGitOrThrow } from '../git/git-runner'
import { remoteList, resolveRemoteName } from '../git/operations/remote'

export function createRepoContextResolver<TContext>(
  parseRemote: (url: string, settings: AppSettings) => TContext | null,
  providerLabel: string
): (
  repoPath: string,
  settings: AppSettings,
  remoteName?: string
) => Promise<TContext> {
  return async (repoPath, settings, remoteName = settings.defaultRemote || 'origin') => {
    const gitBinaryPath = settings.gitBinaryPath

    const resolved = await resolveRemoteName(repoPath, gitBinaryPath, remoteName)
    const stdout = await runGitOrThrow(buildRemoteGetUrlArgs(resolved), {
      cwd: repoPath,
      gitBinaryPath
    })
    const parsed = parseRemote(stdout.trim(), settings)
    if (parsed) {
      return parsed
    }

    const remotes = await remoteList(repoPath, gitBinaryPath)
    for (const remote of remotes) {
      const candidate = parseRemote(remote.url, settings)
      if (candidate) {
        return candidate
      }
    }

    throw new Error(
      `Remote "${resolved}" is not a ${providerLabel} repository and no other ${providerLabel} remote was found`
    )
  }
}
