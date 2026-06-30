import { runGitOrThrow } from '../git-runner'
import type { GitRemote } from '../types'

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
  if (remote) args.push(remote)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function pushRemote(
  cwd: string,
  gitBinaryPath: string,
  remote: string,
  branch?: string,
  setUpstream = false
): Promise<void> {
  const args = ['push']
  if (setUpstream) args.push('-u')
  args.push(remote)
  if (branch) args.push(branch)
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function pullRemote(
  cwd: string,
  gitBinaryPath: string,
  remote?: string,
  branch?: string
): Promise<void> {
  const args = ['pull']
  if (remote) {
    args.push(remote)
    if (branch) args.push(branch)
  }
  await runGitOrThrow(args, { cwd, gitBinaryPath })
}
