import { runGitOrThrow } from '../git-runner'
import { readGitMetadataFile, rebaseInProgress } from '../git-dir'
import type { GitMergeStatus } from '../types'

export async function mergeStatus(cwd: string, gitBinaryPath: string): Promise<GitMergeStatus> {
  const mergeActive = Boolean(await readGitMetadataFile(cwd, gitBinaryPath, 'MERGE_HEAD'))
  const rebaseActive = await rebaseInProgress(cwd, gitBinaryPath)
  const cherryPickActive = Boolean(
    await readGitMetadataFile(cwd, gitBinaryPath, 'CHERRY_PICK_HEAD')
  )
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
    ours: await readGitMetadataFile(cwd, gitBinaryPath, 'MERGE_HEAD'),
    theirs: await readGitMetadataFile(cwd, gitBinaryPath, 'ORIG_HEAD')
  }
}

export async function mergeStart(
  cwd: string,
  gitBinaryPath: string,
  branch: string,
  options: { noFf?: boolean; squash?: boolean } = {}
): Promise<void> {
  const args = ['merge']
  if (options.noFf) args.push('--no-ff')
  if (options.squash) args.push('--squash')
  args.push(branch)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function mergeAbort(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['merge', '--abort'], { cwd, gitBinaryPath })
}

export async function mergeContinue(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['merge', '--continue'], { cwd, gitBinaryPath })
}
