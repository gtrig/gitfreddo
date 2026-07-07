import {
  buildStashApplyArgs,
  buildStashBranchArgs,
  buildStashDropArgs,
  buildStashFilesArgs,
  buildStashListArgs,
  buildStashPopArgs,
  buildStashPushArgs,
  buildStashShowArgs
} from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'
import type { GitDiffResult, GitStashEntry } from '../types'

export function parseStashListLine(line: string, index: number): GitStashEntry | null {
  const trimmed = line.trim()
  if (!trimmed) return null

  const [ref, hash, message] = trimmed.split('\x1f')
  const branchMatch = message?.match(/WIP on ([^:]+):/)
  return {
    index,
    message: message?.trim() ?? '',
    branch: branchMatch?.[1]?.trim() ?? '',
    hash: hash ?? ref ?? ''
  }
}

export async function stashList(cwd: string, gitBinaryPath: string): Promise<GitStashEntry[]> {
  const stdout = await runGitOrThrow(buildStashListArgs(), { cwd, gitBinaryPath })
  if (!stdout.trim()) return []

  return stdout
    .split('\n')
    .map((line, index) => parseStashListLine(line, index))
    .filter((entry): entry is GitStashEntry => entry !== null)
}

export async function stashPush(
  cwd: string,
  gitBinaryPath: string,
  message?: string,
  options: { includeUntracked?: boolean; includeIgnored?: boolean; paths?: string[] } = {}
): Promise<void> {
  await runGitOrThrow(
    buildStashPushArgs({
      message,
      includeUntracked: options.includeUntracked,
      includeIgnored: options.includeIgnored,
      paths: options.paths
    }),
    { cwd, gitBinaryPath }
  )
}

export async function stashBranch(
  cwd: string,
  gitBinaryPath: string,
  branchName: string,
  index = 0
): Promise<void> {
  await runGitOrThrow(buildStashBranchArgs(branchName, index), { cwd, gitBinaryPath })
}

export async function stashPop(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(buildStashPopArgs(index), { cwd, gitBinaryPath })
}

export async function stashApply(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(buildStashApplyArgs(index), { cwd, gitBinaryPath })
}

export async function stashDrop(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(buildStashDropArgs(index), { cwd, gitBinaryPath })
}

export async function stashShow(
  cwd: string,
  gitBinaryPath: string,
  index = 0,
  path?: string
): Promise<GitDiffResult> {
  const unified = await runGitOrThrow(buildStashShowArgs({ index, path }), { cwd, gitBinaryPath })
  return { unified, path: path ?? `stash@{${index}}` }
}

export async function stashFiles(
  cwd: string,
  gitBinaryPath: string,
  index = 0
): Promise<string> {
  return runGitOrThrow(buildStashFilesArgs(index), { cwd, gitBinaryPath })
}
