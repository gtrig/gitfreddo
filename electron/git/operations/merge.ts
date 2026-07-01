import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { runGitOrThrow } from '../git-runner'
import type { GitMergeStatus } from '../types'

function existsRebase(cwd: string): boolean {
  return (
    existsSync(join(cwd, '.git', 'rebase-merge')) ||
    existsSync(join(cwd, '.git', 'rebase-apply'))
  )
}

function readHeadFile(cwd: string, name: string): string | undefined {
  try {
    return readFileSync(join(cwd, '.git', name), 'utf8').trim()
  } catch {
    return undefined
  }
}

export async function mergeStatus(cwd: string, gitBinaryPath: string): Promise<GitMergeStatus> {
  const mergeActive = Boolean(readHeadFile(cwd, 'MERGE_HEAD'))
  const rebaseActive = existsRebase(cwd)
  const cherryPickActive = Boolean(readHeadFile(cwd, 'CHERRY_PICK_HEAD'))
  const inProgress = mergeActive || rebaseActive || cherryPickActive

  let conflictedPaths: string[] = []
  if (inProgress) {
    const stdout = await runGitOrThrow(['diff', '--name-only', '--diff-filter=U'], {
      cwd,
      gitBinaryPath
    })
    conflictedPaths = stdout.split('\n').filter(Boolean)
  }

  const kind = mergeActive
    ? 'merge'
    : rebaseActive
      ? 'rebase'
      : cherryPickActive
        ? 'cherry-pick'
        : null

  return {
    inProgress,
    kind,
    conflictedPaths,
    ours: readHeadFile(cwd, 'MERGE_HEAD'),
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
