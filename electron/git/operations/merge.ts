import { readFileSync } from 'fs'
import { join } from 'path'
import { runGitOrThrow } from '../git-runner'
import type { GitMergeStatus } from '../types'

function readHeadFile(cwd: string, name: string): string | undefined {
  try {
    return readFileSync(join(cwd, '.git', name), 'utf8').trim()
  } catch {
    return undefined
  }
}

export async function mergeStatus(cwd: string, gitBinaryPath: string): Promise<GitMergeStatus> {
  const ours = readHeadFile(cwd, 'MERGE_HEAD')
  const inProgress = Boolean(ours) || Boolean(readHeadFile(cwd, 'REBASE_HEAD'))

  let conflictedPaths: string[] = []
  if (inProgress) {
    const stdout = await runGitOrThrow(['diff', '--name-only', '--diff-filter=U'], {
      cwd,
      gitBinaryPath
    })
    conflictedPaths = stdout.split('\n').filter(Boolean)
  }

  return {
    inProgress,
    conflictedPaths,
    ours,
    theirs: readHeadFile(cwd, 'ORIG_HEAD')
  }
}

export async function mergeStart(
  cwd: string,
  gitBinaryPath: string,
  branch: string
): Promise<void> {
  await runGitOrThrow(['merge', branch], { cwd, gitBinaryPath })
}

export async function mergeAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['merge', '--abort'], { cwd, gitBinaryPath })
}

export async function mergeContinue(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['merge', '--continue'], { cwd, gitBinaryPath })
}
