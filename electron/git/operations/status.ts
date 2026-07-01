import { existsSync } from 'fs'
import { join } from 'path'
import { runGit, runGitOrThrow } from '../git-runner'
import type { GitFileChange, GitWorkingStatus } from '../types'

function statusCharToKind(
  indexStatus: string,
  workTreeStatus: string
): GitFileChange['status'] | null {
  const idx = indexStatus === '?' ? '?' : indexStatus
  const wt = workTreeStatus === '?' ? '?' : workTreeStatus

  if (idx === 'U' || wt === 'U') return 'conflicted'
  if (idx === '?' && wt === '?') return 'untracked'
  if (idx === 'A' || wt === 'A') return 'added'
  if (idx === 'D' || wt === 'D') return 'deleted'
  if (idx === 'R' || wt === 'R') return 'renamed'
  if (idx === 'C' || wt === 'C') return 'copied'
  if (idx === 'M' || wt === 'M') return 'modified'
  return null
}

async function parseAheadBehind(
  cwd: string,
  gitBinaryPath: string
): Promise<{ ahead: number; behind: number }> {
  try {
    const out = await runGitOrThrow(['rev-list', '--left-right', '--count', '@{upstream}...HEAD'], {
      cwd,
      gitBinaryPath
    })
    const [behind, ahead] = out.trim().split(/\s+/).map(Number)
    return { ahead: ahead ?? 0, behind: behind ?? 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

export async function workingStatus(
  cwd: string,
  gitBinaryPath: string
): Promise<GitWorkingStatus> {
  const stdout = await runGitOrThrow(['status', '--porcelain=2', '-b'], { cwd, gitBinaryPath })
  const lines = stdout.split('\n')

  let branch = 'HEAD'
  let ahead = 0
  let behind = 0
  const staged: GitFileChange[] = []
  const unstaged: GitFileChange[] = []
  const untracked: GitFileChange[] = []
  const conflicted: GitFileChange[] = []

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const parts = line.slice('# branch.ab '.length).trim().split(' ')
      ahead = Math.max(0, Number(parts[1]) || 0)
      behind = Math.max(0, Math.abs(Number(parts[0]) || 0))
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const change = parsePorcelainV2Line(line)
      if (!change) continue
      if (change.status === 'conflicted') {
        conflicted.push(change)
      } else if (line[2] !== '.' && line[2] !== ' ') {
        staged.push(change)
      } else if (line[3] !== '.' && line[3] !== ' ') {
        unstaged.push(change)
      }
    } else if (line.startsWith('? ')) {
      const path = line.slice(2).trim()
      untracked.push({ path, status: 'untracked' })
    } else if (line.startsWith('u ')) {
      const change = parsePorcelainV2Line(line)
      if (change) conflicted.push(change)
    }
  }

  if (ahead === 0 && behind === 0) {
    const ab = await parseAheadBehind(cwd, gitBinaryPath)
    ahead = ab.ahead
    behind = ab.behind
  }

  const mergeInProgress = existsMerge(cwd)
  const rebaseInProgress = existsRebase(cwd)
  const cherryPickInProgress = existsCherryPick(cwd)

  return {
    branch,
    ahead,
    behind,
    staged,
    unstaged,
    untracked,
    conflicted,
    isClean:
      staged.length === 0 &&
      unstaged.length === 0 &&
      untracked.length === 0 &&
      conflicted.length === 0,
    mergeInProgress,
    rebaseInProgress,
    cherryPickInProgress
  }
}

function parsePorcelainV2Line(line: string): GitFileChange | null {
  const parts = line.split(' ')
  if (parts.length < 9) return null
  const xy = parts[1] ?? ''
  const path = parts.slice(8).join(' ')
  const indexStatus = xy[0] ?? '.'
  const workTreeStatus = xy[1] ?? '.'
  const status = statusCharToKind(indexStatus, workTreeStatus)
  if (!status) return null
  return { path, status }
}

function existsMerge(cwd: string): boolean {
  return existsSync(join(cwd, '.git', 'MERGE_HEAD'))
}

function existsRebase(cwd: string): boolean {
  return (
    existsSync(join(cwd, '.git', 'rebase-merge')) ||
    existsSync(join(cwd, '.git', 'rebase-apply'))
  )
}

function existsCherryPick(cwd: string): boolean {
  return existsSync(join(cwd, '.git', 'CHERRY_PICK_HEAD'))
}

export async function stageAdd(
  cwd: string,
  gitBinaryPath: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) {
    await runGitOrThrow(['add', '-A'], { cwd, gitBinaryPath })
  } else {
    await runGitOrThrow(['add', '--', ...paths], { cwd, gitBinaryPath })
  }
}

export async function stageReset(
  cwd: string,
  gitBinaryPath: string,
  paths?: string[]
): Promise<void> {
  if (!paths || paths.length === 0) {
    await runGitOrThrow(['reset', 'HEAD'], { cwd, gitBinaryPath })
  } else {
    await runGitOrThrow(['reset', 'HEAD', '--', ...paths], { cwd, gitBinaryPath })
  }
}

export async function workingDiscard(
  cwd: string,
  gitBinaryPath: string,
  paths: string[],
  staged = false
): Promise<void> {
  if (paths.length === 0) return

  const restoreArgs = staged
    ? ['restore', '--source=HEAD', '--staged', '--worktree', '--', ...paths]
    : ['restore', '--worktree', '--', ...paths]

  const result = await runGit(restoreArgs, { cwd, gitBinaryPath })
  if (result.code === 0) return

  const checkoutArgs = staged
    ? ['checkout', 'HEAD', '--', ...paths]
    : ['checkout', '--', ...paths]
  await runGitOrThrow(checkoutArgs, { cwd, gitBinaryPath })
}

export async function workingRemove(
  cwd: string,
  gitBinaryPath: string,
  paths: string[]
): Promise<void> {
  if (paths.length === 0) return

  const result = await runGit(['rm', '--', ...paths], { cwd, gitBinaryPath })
  if (result.code === 0) return

  await runGitOrThrow(['rm', '-f', '--', ...paths], { cwd, gitBinaryPath })
}

/** Parse `git clean -n` output lines into relative paths. */
export function parseCleanPreviewOutput(stdout: string): string[] {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^Would remove\s+/, ''))
}

export async function workingCleanPreview(
  cwd: string,
  gitBinaryPath: string,
  includeIgnored = false
): Promise<string[]> {
  const args = ['clean', '-fdn']
  if (includeIgnored) args.push('-x')
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  return parseCleanPreviewOutput(stdout)
}

export async function workingClean(
  cwd: string,
  gitBinaryPath: string,
  includeIgnored = false
): Promise<void> {
  const args = ['clean', '-fd']
  if (includeIgnored) args.push('-x')
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function commitCreate(
  cwd: string,
  gitBinaryPath: string,
  message: string,
  amend = false
): Promise<string> {
  const args = ['commit', '-m', message]
  if (amend) args.push('--amend')
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  const match = stdout.match(/\[[\w/.-]+ ([0-9a-f]+)\]/)
  if (match) return match[1]
  return (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd, gitBinaryPath })).trim()
}
