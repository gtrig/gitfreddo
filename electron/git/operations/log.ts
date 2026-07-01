import { buildLogGraphArgs, parseLogGraphOutput } from '../../../shared/gitLog'
import { runGitOrThrow } from '../git-runner'
import type { GitCommit, GitLogGraphResult } from '../types'

export async function logGraph(
  cwd: string,
  gitBinaryPath: string,
  maxCount = 500
): Promise<GitLogGraphResult> {
  const stdout = await runGitOrThrow(buildLogGraphArgs(maxCount), { cwd, gitBinaryPath })
  const commits = parseLogGraphOutput(stdout) as GitCommit[]
  return { commits, maxCount }
}

export async function showCommit(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<string> {
  return runGitOrThrow(['show', '--format=', '--name-status', hash], { cwd, gitBinaryPath })
}

export async function commitMessage(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<string> {
  return runGitOrThrow(['log', '-1', '--format=%B', hash], { cwd, gitBinaryPath })
}
