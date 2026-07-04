import { runGit, runGitOrThrow } from '../git-runner'
import type { GitBranch } from '../types'

export function stripAnsi(text: string): string {
  return text.replace(/\x1B\[[0-9;]*m/g, '')
}

export function parseBranchLine(line: string): GitBranch | null {
  const trimmed = stripAnsi(line).trim()
  if (!trimmed) return null

  let isCurrent = false
  let isRemote = false
  let rest = trimmed

  if (rest.startsWith('* ')) {
    isCurrent = true
    rest = rest.slice(2)
  } else if (rest.startsWith('  ')) {
    rest = rest.slice(2)
  }

  if (rest.startsWith('remotes/')) {
    isRemote = true
  }

  if (rest.includes(' -> ')) return null

  const [name, head] = rest.split(/\s+/)
  if (!name || !head || !/^[0-9a-f]{40}$/i.test(head)) return null

  return {
    name,
    head,
    ahead: 0,
    behind: 0,
    isCurrent,
    isRemote
  }
}

async function branchAheadBehind(
  cwd: string,
  gitBinaryPath: string,
  branch: string,
  upstream: string
): Promise<{ ahead: number; behind: number }> {
  try {
    const out = await runGitOrThrow(
      ['rev-list', '--left-right', '--count', `${upstream}...${branch}`],
      { cwd, gitBinaryPath }
    )
    const [behind, ahead] = out.trim().split(/\s+/).map(Number)
    return { ahead: ahead ?? 0, behind: behind ?? 0 }
  } catch {
    return { ahead: 0, behind: 0 }
  }
}

export async function branchList(cwd: string, gitBinaryPath: string): Promise<GitBranch[]> {
  const stdout = await runGitOrThrow(['branch', '-a', '-v', '--no-abbrev'], { cwd, gitBinaryPath })
  const parsed = stdout
    .split('\n')
    .map(parseBranchLine)
    .filter((b): b is GitBranch => b !== null)

  const localBranches = parsed.filter((b) => !b.isRemote)
  const remoteBranches = parsed.filter((b) => b.isRemote && !b.name.endsWith('/HEAD'))

  for (const branch of localBranches) {
    try {
      const upstream = (
        await runGit(['rev-parse', '--abbrev-ref', `${branch.name}@{upstream}`], {
          cwd,
          gitBinaryPath
        })
      ).stdout.trim()
      if (upstream) {
        branch.upstream = upstream
        const ab = await branchAheadBehind(cwd, gitBinaryPath, branch.name, upstream)
        branch.ahead = ab.ahead
        branch.behind = ab.behind
      }
    } catch {
      // no upstream
    }
  }

  return [...localBranches, ...remoteBranches]
}

export async function branchCheckout(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<void> {
  await runGitOrThrow(['switch', '--end-of-options', name], { cwd, gitBinaryPath })
}

export async function branchCreate(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  startPoint?: string
): Promise<void> {
  const args = ['branch', '--end-of-options', name]
  if (startPoint) args.push(startPoint)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function branchDelete(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  force = false
): Promise<void> {
  await runGitOrThrow(['branch', force ? '-D' : '-d', '--end-of-options', name], {
    cwd,
    gitBinaryPath
  })
}

export async function branchRename(
  cwd: string,
  gitBinaryPath: string,
  oldName: string,
  newName: string
): Promise<void> {
  await runGitOrThrow(['branch', '-m', '--end-of-options', oldName, newName], {
    cwd,
    gitBinaryPath
  })
}

export function parseRemoteBranchRef(name: string): { remote: string; branch: string } | null {
  const ref = name.replace(/^remotes\//, '')
  const slash = ref.indexOf('/')
  if (slash <= 0) return null
  return { remote: ref.slice(0, slash), branch: ref.slice(slash + 1) }
}

export async function branchCheckoutRemote(
  cwd: string,
  gitBinaryPath: string,
  remoteBranch: string,
  localName?: string
): Promise<void> {
  const parsed = parseRemoteBranchRef(remoteBranch)
  if (!parsed) {
    throw new Error('Invalid remote branch reference.')
  }

  const trackingRef = `${parsed.remote}/${parsed.branch}`
  const local = localName?.trim() || parsed.branch
  const exists = await runGit(['rev-parse', '--verify', `refs/heads/${local}`], {
    cwd,
    gitBinaryPath
  })

  if (exists.code === 0) {
    await runGitOrThrow(['switch', '--end-of-options', local], { cwd, gitBinaryPath })
    return
  }

  await runGitOrThrow(['switch', '-c', local, '--track', trackingRef], { cwd, gitBinaryPath })
}

export async function branchSetUpstream(
  cwd: string,
  gitBinaryPath: string,
  branch: string,
  upstream: string
): Promise<void> {
  await runGitOrThrow(['branch', '--set-upstream-to', upstream, branch], {
    cwd,
    gitBinaryPath
  })
}

export async function branchUnsetUpstream(
  cwd: string,
  gitBinaryPath: string,
  branch?: string
): Promise<void> {
  const args = ['branch', '--unset-upstream']
  if (branch?.trim()) args.push(branch.trim())
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function branchDeleteRemote(
  cwd: string,
  gitBinaryPath: string,
  remote: string,
  branch: string
): Promise<void> {
  await runGitOrThrow(['push', remote, `:refs/heads/${branch}`], { cwd, gitBinaryPath })
}
