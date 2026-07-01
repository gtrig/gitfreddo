import { runGit, runGitOrThrow } from '../git-runner'
import type { GitRemote } from '../types'

export function remoteNameFromUpstream(upstream: string): string {
  const slash = upstream.indexOf('/')
  return slash > 0 ? upstream.slice(0, slash) : upstream
}

export async function resolveRemoteName(
  cwd: string,
  gitBinaryPath: string,
  remote?: string
): Promise<string> {
  const requested = remote?.trim()
  const remotes = await remoteList(cwd, gitBinaryPath)
  const names = new Set(remotes.map((entry) => entry.name))

  if (requested && names.has(requested)) {
    return requested
  }

  try {
    const upstream = (
      await runGitOrThrow(['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd, gitBinaryPath })
    ).trim()
    const upstreamRemote = remoteNameFromUpstream(upstream)
    if (names.has(upstreamRemote)) {
      return upstreamRemote
    }
  } catch {
    // no upstream configured
  }

  if (remotes.length === 1) {
    return remotes[0]!.name
  }

  if (requested) {
    throw new Error(
      `Remote "${requested}" is not configured. Add it in Remotes or update Settings → Default remote.`
    )
  }

  throw new Error(
    'No remote configured. Add a remote in the Remotes panel or set a default remote in Settings.'
  )
}

async function branchHasUpstream(cwd: string, gitBinaryPath: string): Promise<boolean> {
  const result = await runGit(['rev-parse', '--abbrev-ref', '@{upstream}'], { cwd, gitBinaryPath })
  return result.code === 0 && Boolean(result.stdout.trim())
}

export async function remoteList(cwd: string, gitBinaryPath: string): Promise<GitRemote[]> {
  const stdout = await runGitOrThrow(['remote', '-v'], { cwd, gitBinaryPath })
  const map = new Map<string, GitRemote>()

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [name, url, type] = trimmed.split(/\s+/)
    if (!name || !url) continue
    const existing = map.get(name) ?? { name, url, fetch: '', push: '' }
    if (type === '(fetch)') existing.fetch = url
    if (type === '(push)') existing.push = url
    if (!existing.url) existing.url = url
    map.set(name, existing)
  }

  return [...map.values()]
}

export async function remoteAdd(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  url: string
): Promise<void> {
  await runGitOrThrow(['remote', 'add', name, url], { cwd, gitBinaryPath })
}

export async function remoteRemove(
  cwd: string,
  gitBinaryPath: string,
  name: string
): Promise<void> {
  await runGitOrThrow(['remote', 'remove', name], { cwd, gitBinaryPath })
}

export async function fetchRemote(
  cwd: string,
  gitBinaryPath: string,
  remote?: string
): Promise<void> {
  const args = ['fetch', '--prune']
  args.push(await resolveRemoteName(cwd, gitBinaryPath, remote))
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function pushRemote(
  cwd: string,
  gitBinaryPath: string,
  remote?: string,
  branch?: string,
  setUpstream = false,
  force = false
): Promise<void> {
  const currentBranch = (
    await runGitOrThrow(['rev-parse', '--abbrev-ref', 'HEAD'], { cwd, gitBinaryPath })
  ).trim()

  if (currentBranch === 'HEAD') {
    throw new Error('Cannot push while in a detached HEAD state.')
  }

  const pushBranch = branch?.trim() || currentBranch
  const pushRemoteName = await resolveRemoteName(cwd, gitBinaryPath, remote)
  const useUpstream = setUpstream || !(await branchHasUpstream(cwd, gitBinaryPath))

  const args = ['push']
  if (force) args.push('--force-with-lease')
  if (useUpstream) args.push('-u')
  args.push(pushRemoteName, pushBranch)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function pullRemote(
  cwd: string,
  gitBinaryPath: string,
  remote?: string,
  branch?: string
): Promise<void> {
  const pullRemoteName = await resolveRemoteName(cwd, gitBinaryPath, remote)
  const args = ['pull', pullRemoteName]
  if (branch?.trim()) {
    args.push(branch.trim())
  }
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}
