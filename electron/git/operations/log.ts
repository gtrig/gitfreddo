import {
  buildLogGraphArgs,
  buildLogMessageArgs,
  buildLogTreeArgs,
  buildShowCommitNameStatusArgs,
  parseLogGraphOutput
} from '../../../shared/gitLog'
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
  return runGitOrThrow(buildShowCommitNameStatusArgs(hash), { cwd, gitBinaryPath })
}

export async function commitMessage(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<string> {
  return runGitOrThrow(buildLogMessageArgs({ hash }), { cwd, gitBinaryPath })
}

export async function listTreeFiles(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<string[]> {
  const stdout = await runGitOrThrow(buildLogTreeArgs({ hash }), { cwd, gitBinaryPath })
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}
