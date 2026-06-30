import { runGitOrThrow } from '../git-runner'
import type { GitStashEntry } from '../types'

export async function stashList(cwd: string, gitBinaryPath: string): Promise<GitStashEntry[]> {
  const stdout = await runGitOrThrow(
    ['stash', 'list', '--format=%gd%x1f%H%x1f%s'],
    { cwd, gitBinaryPath }
  )
  if (!stdout.trim()) return []

  return stdout
    .split('\n')
    .filter(Boolean)
    .map((line, index) => {
      const [ref, hash, message] = line.split('\x1f')
      const branchMatch = message?.match(/WIP on ([^:]+):/)
      return {
        index,
        message: message?.trim() ?? '',
        branch: branchMatch?.[1]?.trim() ?? '',
        hash: hash ?? ref ?? ''
      }
    })
}

export async function stashPush(
  cwd: string,
  gitBinaryPath: string,
  message?: string
): Promise<void> {
  const args = ['stash', 'push']
  if (message) {
    args.push('-m', message)
  }
  await runGitOrThrow(args, { cwd, gitBinaryPath })
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
  index = 0
): Promise<string> {
  return runGitOrThrow(['stash', 'show', '-p', `stash@{${index}}`], { cwd, gitBinaryPath })
}
