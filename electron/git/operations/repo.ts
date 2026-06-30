import { runGitOrThrow } from '../git-runner'
import type { GitRepoStatus } from '../types'

export async function repoStatus(
  cwd: string,
  gitBinaryPath: string
): Promise<GitRepoStatus> {
  const branch = (
    await runGitOrThrow(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, gitBinaryPath })
  ).trim()
  const head = (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd, gitBinaryPath })).trim()
  const root = (await runGitOrThrow(['rev-parse', '--show-toplevel'], { cwd, gitBinaryPath })).trim()
  return {
    path: cwd,
    root,
    head,
    branch,
    isDetached: branch === 'HEAD'
  }
}
