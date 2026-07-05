import type { SubmoduleEntryStatus } from '../../../shared/submodule'
import { runGit, runGitOrThrow } from '../git-runner'
import { gitMetadataExists, rebaseInProgress } from '../git-dir'
import type { GitFileChange, GitWorkingStatus } from '../types'

function singleStatusCharToKind(char: string): GitFileChange['status'] | null {
  if (char === 'U') return 'conflicted'
  if (char === '?') return 'untracked'
  if (char === 'A') return 'added'
  if (char === 'D') return 'deleted'
  if (char === 'R') return 'renamed'
  if (char === 'C') return 'copied'
  if (char === 'M') return 'modified'
  return null
}

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
  const stdout = await runGitOrThrow(
    ['status', '--porcelain=2', '-b', '-uall'],
    { cwd, gitBinaryPath }
  )
  const lines = stdout.split('\n')

  let branch = 'HEAD'
  let ahead = 0
  let behind = 0
  const staged: GitFileChange[] = []
  const unstaged: GitFileChange[] = []
  const untracked: GitFileChange[] = []
  const conflicted: GitFileChange[] = []
  const submoduleModified = new Set<string>()

  for (const line of lines) {
    if (line.startsWith('# branch.head ')) {
      branch = line.slice('# branch.head '.length).trim()
    } else if (line.startsWith('# branch.ab ')) {
      const parts = line.slice('# branch.ab '.length).trim().split(' ')
      ahead = Math.max(0, Number(parts[1]) || 0)
      behind = Math.max(0, Math.abs(Number(parts[0]) || 0))
    } else if (line.startsWith('# submodule.')) {
      const path = line.slice(line.indexOf(' ') + 1).trim()
      if (path) submoduleModified.add(path)
    } else if (line.startsWith('1 ') || line.startsWith('2 ')) {
      const classified = classifyPorcelainV2Line(line)
      if (classified.conflicted) {
        conflicted.push(classified.conflicted)
      } else {
        if (classified.staged) staged.push(classified.staged)
        if (classified.unstaged) unstaged.push(classified.unstaged)
      }
    } else if (line.startsWith('? ')) {
      const path = line.slice(2).trim()
      untracked.push({ path, status: 'untracked' })
    } else if (line.startsWith('u ')) {
      const change = parsePorcelainV2Line(line)
      if (change) conflicted.push(change)
    }
  }

  if (submoduleModified.size > 0) {
    const enrich = (change: GitFileChange): GitFileChange =>
      submoduleModified.has(change.path)
        ? {
            ...change,
            isSubmodule: true,
            submoduleStatus: change.submoduleStatus ?? 'dirty'
          }
        : change
    for (let i = 0; i < staged.length; i++) staged[i] = enrich(staged[i]!)
    for (let i = 0; i < unstaged.length; i++) unstaged[i] = enrich(unstaged[i]!)
  }

  if (ahead === 0 && behind === 0) {
    const ab = await parseAheadBehind(cwd, gitBinaryPath)
    ahead = ab.ahead
    behind = ab.behind
  }

  const mergeInProgress = await gitMetadataExists(cwd, gitBinaryPath, 'MERGE_HEAD')
  const rebaseInProgressFlag = await rebaseInProgress(cwd, gitBinaryPath)
  const cherryPickInProgress = await gitMetadataExists(cwd, gitBinaryPath, 'CHERRY_PICK_HEAD')

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
    rebaseInProgress: rebaseInProgressFlag,
    cherryPickInProgress
  }
}

/** Parse a porcelain v2 status line (`1`, `2`, or `u` record). Exported for unit tests. */
export function parsePorcelainV2Line(line: string): GitFileChange | null {
  const parts = line.split(' ')
  if (parts.length < 9) return null
  const recordType = parts[0]
  const xy = parts[1] ?? ''
  const indexStatus = xy[0] ?? '.'
  const workTreeStatus = xy[1] ?? '.'
  const status = statusCharToKind(indexStatus, workTreeStatus)
  if (!status) return null
  const isSubmodule = parts[3] === '160000' || parts[4] === '160000'
  const submoduleStatus: SubmoduleEntryStatus | undefined = isSubmodule
    ? status === 'added'
      ? 'uninitialized'
      : status === 'modified'
        ? 'ahead'
        : 'initialized'
    : undefined

  const withSubmodule = (change: GitFileChange): GitFileChange =>
    isSubmodule ? { ...change, isSubmodule: true, submoduleStatus } : change

  if (recordType === '2') {
    // rename/copy: <score> <newPath>\t<oldPath>
    if (parts.length < 10) return null
    const pathField = parts.slice(9).join(' ')
    const tabIndex = pathField.indexOf('\t')
    if (tabIndex === -1) return withSubmodule({ path: pathField, status })
    return withSubmodule({
      path: pathField.slice(0, tabIndex),
      oldPath: pathField.slice(tabIndex + 1),
      status
    })
  }

  if (recordType === 'u') {
    const path = parts.slice(10).join(' ')
    return path ? withSubmodule({ path, status }) : null
  }

  const path = parts.slice(8).join(' ')
  return path ? withSubmodule({ path, status }) : null
}

export interface PorcelainV2Classification {
  staged: GitFileChange | null
  unstaged: GitFileChange | null
  conflicted: GitFileChange | null
}

/** Split a porcelain v2 `1`/`2` line into staged and/or unstaged entries. Exported for unit tests. */
export function classifyPorcelainV2Line(line: string): PorcelainV2Classification {
  const change = parsePorcelainV2Line(line)
  if (!change) return { staged: null, unstaged: null, conflicted: null }

  if (change.status === 'conflicted') {
    return { staged: null, unstaged: null, conflicted: change }
  }

  const xy = line.split(' ')[1] ?? ''
  const indexStatus = xy[0] ?? '.'
  const workTreeStatus = xy[1] ?? '.'

  const stagedStatus = singleStatusCharToKind(indexStatus)
  const unstagedStatus = singleStatusCharToKind(workTreeStatus)

  return {
    staged:
      stagedStatus && indexStatus !== '.'
        ? { ...change, status: stagedStatus }
        : null,
    unstaged:
      unstagedStatus && workTreeStatus !== '.'
        ? { ...change, status: unstagedStatus }
        : null,
    conflicted: null
  }
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
  amend = false,
  sign = false
): Promise<string> {
  const args = ['commit', '-m', message]
  if (amend) args.push('--amend')
  if (sign) args.push('-S')
  const stdout = await runGitOrThrow(args, { cwd, gitBinaryPath })
  const match = stdout.match(/\[[\w/.-]+ ([0-9a-f]+)\]/)
  if (match) return match[1]
  return (await runGitOrThrow(['rev-parse', 'HEAD'], { cwd, gitBinaryPath })).trim()
}
