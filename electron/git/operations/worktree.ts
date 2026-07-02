import { resolve } from 'path'
import { runGitOrThrow } from '../git-runner'
import type { GitWorktreeEntry } from '../types'

interface ParsedWorktreeBlock {
  path?: string
  head?: string
  branch?: string
  isBare?: boolean
  isDetached?: boolean
  locked?: string
  prunable?: string
}

/** Parse `git worktree list --porcelain` output into worktree entries. */
export function parseWorktreeListPorcelain(stdout: string): ParsedWorktreeBlock[] {
  const blocks: ParsedWorktreeBlock[] = []
  let current: ParsedWorktreeBlock = {}

  for (const line of stdout.split('\n')) {
    if (!line.trim()) {
      if (current.path) {
        blocks.push(current)
        current = {}
      }
      continue
    }

    if (line.startsWith('worktree ')) {
      if (current.path) {
        blocks.push(current)
      }
      current = { path: line.slice('worktree '.length).trim() }
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length).trim()
    } else if (line.startsWith('branch ')) {
      const ref = line.slice('branch '.length).trim()
      current.branch = ref.replace(/^refs\/heads\//, '')
      current.isDetached = false
    } else if (line === 'bare') {
      current.isBare = true
    } else if (line === 'detached') {
      current.isDetached = true
    } else if (line.startsWith('locked ')) {
      current.locked = line.slice('locked '.length).trim() || 'locked'
    } else if (line.startsWith('prunable ')) {
      current.prunable = line.slice('prunable '.length).trim() || 'prunable'
    }
  }

  if (current.path) {
    blocks.push(current)
  }

  return blocks
}

function toEntry(block: ParsedWorktreeBlock, index: number): GitWorktreeEntry {
  return {
    path: block.path ?? '',
    head: block.head ?? '',
    branch: block.branch,
    isDetached: Boolean(block.isDetached),
    isBare: Boolean(block.isBare),
    isMain: index === 0,
    locked: block.locked,
    prunable: block.prunable
  }
}

export async function worktreeList(
  cwd: string,
  gitBinaryPath: string
): Promise<GitWorktreeEntry[]> {
  const stdout = await runGitOrThrow(['worktree', 'list', '--porcelain'], {
    cwd,
    gitBinaryPath
  })
  if (!stdout.trim()) return []

  const blocks = parseWorktreeListPorcelain(stdout)
  return blocks.map((block, index) => toEntry(block, index))
}

export async function worktreeAdd(
  cwd: string,
  gitBinaryPath: string,
  params: {
    path: string
    branch?: string
    newBranch?: string
    detach?: boolean
    commit?: string
  }
): Promise<string> {
  const args = ['worktree', 'add']
  if (params.detach) {
    args.push('--detach')
  }
  if (params.newBranch) {
    args.push('-b', params.newBranch)
  }
  args.push(params.path)
  if (params.branch) {
    args.push(params.branch)
  } else if (params.commit) {
    args.push(params.commit)
  }

  await runGitOrThrow(args, { cwd, gitBinaryPath })
  return resolve(params.path)
}

export async function worktreeRemove(
  cwd: string,
  gitBinaryPath: string,
  path: string,
  force = false
): Promise<void> {
  const args = ['worktree', 'remove']
  if (force) args.push('--force')
  args.push(path)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function worktreePrune(cwd: string, gitBinaryPath: string): Promise<void> {
  await runGitOrThrow(['worktree', 'prune'], { cwd, gitBinaryPath })
}
