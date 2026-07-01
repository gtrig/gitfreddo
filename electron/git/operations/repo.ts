import { resolve } from 'path'
import { runGitOrThrow } from '../git-runner'
import { resolveGitCommonDir, resolveGitDir } from '../git-dir'
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
  const gitDir = await resolveGitDir(cwd, gitBinaryPath)
  const commonDir = await resolveGitCommonDir(cwd, gitBinaryPath)
  return {
    path: cwd,
    root,
    head,
    branch,
    isDetached: branch === 'HEAD',
    commonDir,
    isLinkedWorktree: resolve(gitDir) !== resolve(commonDir)
  }
}
