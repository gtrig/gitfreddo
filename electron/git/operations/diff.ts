import { runGit, runGitOrThrow } from '../git-runner'
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
  const args = ['diff', fromRef, toRef, '--']
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
  const hasParent =
    (await runGit(['rev-parse', '--verify', `${oldestHash}^`], { cwd, gitBinaryPath })).code === 0
  const args = hasParent
    ? ['diff', `${oldestHash}^`, newestHash]
    : ['diff', '--root', newestHash]
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: `${oldestHash.slice(0, 7)}..${newestHash.slice(0, 7)}` }
}

export async function diffShow(
  cwd: string,
  gitBinaryPath: string,
  ref: string,
  path?: string
): Promise<GitDiffResult> {
  const args = ['show', ref, '--']
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
