import { resolveGitRef, runGit, runGitOrThrow } from '../git-runner'
import type { GitDiffResult } from '../types'

export async function diffWorking(
  cwd: string,
  gitBinaryPath: string,
  path?: string
): Promise<GitDiffResult> {
  const args = ['diff', '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function diffStaged(
  cwd: string,
  gitBinaryPath: string,
  path?: string
): Promise<GitDiffResult> {
  const args = ['diff', '--cached', '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function diffCommits(
  cwd: string,
  gitBinaryPath: string,
  fromRef: string,
  toRef: string,
  path?: string
): Promise<GitDiffResult> {
  const from = await resolveGitRef(cwd, gitBinaryPath, fromRef)
  const to = await resolveGitRef(cwd, gitBinaryPath, toRef)
  const args = ['diff', from, to, '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function diffCommitRange(
  cwd: string,
  gitBinaryPath: string,
  oldestHash: string,
  newestHash: string
): Promise<GitDiffResult> {
  const oldest = await resolveGitRef(cwd, gitBinaryPath, oldestHash)
  const newest = await resolveGitRef(cwd, gitBinaryPath, newestHash)
  const hasParent =
    (await runGit(['rev-parse', '--verify', `${oldest}^`], { cwd, gitBinaryPath })).code === 0
  const args = hasParent ? ['diff', `${oldest}^`, newest] : ['diff', oldest, newest]
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: `${oldest.slice(0, 7)}..${newest.slice(0, 7)}` }
}

export async function diffShow(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path?: string
): Promise<GitDiffResult> {
  const resolvedRef = await resolveGitRef(cwd, gitBinaryPath, ref)
  const args = ['show', '-m', '--first-parent', resolvedRef, '--']
  if (path) args.push(path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? '' }
}

export async function fileRead(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path: string
): Promise<string> {
  return runGitOrThrow(['show', `${ref}:${path}`], { cwd, gitBinaryPath })
}
