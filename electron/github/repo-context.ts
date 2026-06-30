import { parseGitHubRemote } from '../../shared/github'
import { runGitOrThrow } from '../git/git-runner'
import type { AppSettings } from '../../shared/ipc'

export async function resolveGitHubRepoContext(
  repoPath: string,
  settings: AppSettings,
  remoteName = settings.defaultRemote || 'origin'
): Promise<{ owner: string; repo: string; host: string }> {
  const stdout = await runGitOrThrow(['remote', 'get-url', remoteName], {
    cwd: repoPath,
    gitBinaryPath: settings.gitBinaryPath
  })
  const url = stdout.trim()
  const parsed = parseGitHubRemote(url)
  if (!parsed) {
    throw new Error(`Remote "${remoteName}" is not a GitHub repository (${url})`)
  }
  return parsed
}
