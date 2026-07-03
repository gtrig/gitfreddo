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
  const stdout = await runGitOrThrow(
    ['stash', 'list', '--format=%gd%x1f%H%x1f%s'],
    { cwd, gitBinaryPath }
  )
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
  const args = ['stash', 'push']
  if (options.includeIgnored) args.push('-a')
  else if (options.includeUntracked) args.push('-u')
  if (message) args.push('-m', message)
  if (options.paths && options.paths.length > 0) {
    args.push('--', ...options.paths)
  }
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function stashBranch(
  cwd: string,
  gitBinaryPath: string,
  branchName: string,
  index = 0
): Promise<void> {
  await runGitOrThrow(['stash', 'branch', branchName, `stash@{${index}}`], {
    cwd,
    gitBinaryPath
  })
}

export async function stashPop(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(['stash', 'pop', `stash@{${index}}`], { cwd, gitBinaryPath })
}

export async function stashApply(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(['stash', 'apply', `stash@{${index}}`], { cwd, gitBinaryPath })
}

export async function stashDrop(cwd: string, gitBinaryPath: string, index = 0): Promise<void> {
  await runGitOrThrow(['stash', 'drop', `stash@{${index}}`], { cwd, gitBinaryPath })
}

export async function stashShow(
  cwd: string,
  gitBinaryPath: string,
  index = 0,
  path?: string
): Promise<GitDiffResult> {
  const args = ['stash', 'show', '-p', `stash@{${index}}`]
  if (path) args.push('--', path)
  const unified = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return { unified, path: path ?? `stash@{${index}}` }
}

export async function stashFiles(
  cwd: string,
  gitBinaryPath: string,
  index = 0
): Promise<string> {
  return runGitOrThrow(['stash', 'show', '--name-status', `stash@{${index}}`], {
    cwd,
    gitBinaryPath
  })
}
