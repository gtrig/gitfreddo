import { runGitOrThrow } from '../git-runner'
import { resolveRemoteName } from './remote'
import type { GitTag } from '../types'

const TAG_FIELD_SEPARATOR = '\t'

const TAG_LIST_FORMAT = [
  '%(refname)',
  '%(objectname)',
  '%(*objectname)',
  '%(objecttype)',
  '%(creatordate:iso8601)',
  '%(contents:subject)'
].join('%09')

export function parseTagRef(refname: string): { name: string; isRemote: boolean; remote?: string } | null {
  const trimmed = refname.trim()
  if (trimmed.startsWith('refs/tags/')) {
    return { name: trimmed.slice('refs/tags/'.length), isRemote: false }
  }

  const remoteMatch = /^refs\/remotes\/([^/]+)\/tags\/(.+)$/.exec(trimmed)
  if (remoteMatch) {
    const remote = remoteMatch[1]!
    const tagName = remoteMatch[2]!
    return { name: `${remote}/${tagName}`, isRemote: true, remote }
  }

  return null
}

export function parseTagLine(line: string): GitTag | null {
  const normalized = line.replace(/\r?\n$/, '')
  if (!normalized) return null

  const parts = normalized.split(TAG_FIELD_SEPARATOR)
  if (parts.length < 6) return null

  const [refname, objectHash, peeledHash, objectType, createdAt, subject] = parts
  const parsed = parseTagRef(refname)
  if (!parsed || !objectHash) return null

  const target = peeledHash?.trim() || objectHash.trim()
  const isAnnotated = objectType === 'tag'

  return {
    name: parsed.name,
    target,
    message: isAnnotated ? subject?.trim() || undefined : undefined,
    isAnnotated,
    isRemote: parsed.isRemote,
    remote: parsed.remote,
    createdAt: createdAt?.trim() || undefined
  }
}

export async function tagList(cwd: string, gitBinaryPath: string): Promise<GitTag[]> {
  const stdout = await runGitOrThrow(
    [
      'for-each-ref',
      '--sort=-creatordate',
      'refs/tags',
      'refs/remotes/*/tags',
      `--format=${TAG_LIST_FORMAT}`
    ],
    { cwd, gitBinaryPath }
  )

  if (!stdout.trim()) return []

  const tags = stdout
    .split('\n')
    .map(parseTagLine)
    .filter((tag): tag is GitTag => tag !== null)

  const seen = new Set<string>()
  return tags.filter((tag) => {
    const key = `${tag.isRemote ? 'remote' : 'local'}:${tag.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export async function tagCreate(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  target?: string,
  message?: string
): Promise<void> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Tag name is required.')
  }

  const args = ['tag']
  const trimmedMessage = message?.trim()
  if (trimmedMessage) {
    args.push('-a', trimmedName, '-m', trimmedMessage)
  } else {
    args.push(trimmedName)
  }

  if (target?.trim()) {
    args.push(target.trim())
  }

  await runGitOrThrow(args, { cwd, gitBinaryPath })
}

export async function tagDelete(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  remote?: string
): Promise<void> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Tag name is required.')
  }

  if (remote?.trim()) {
    const remoteName = remote.trim()
    const tagRef = trimmedName.includes('/')
      ? trimmedName.slice(trimmedName.indexOf('/') + 1)
      : trimmedName
    await runGitOrThrow(['push', remoteName, `:refs/tags/${tagRef}`], { cwd, gitBinaryPath })
    return
  }

  const localName = trimmedName.includes('/') ? trimmedName.slice(trimmedName.indexOf('/') + 1) : trimmedName
  await runGitOrThrow(['tag', '-d', localName], { cwd, gitBinaryPath })
}

export async function tagPush(
  cwd: string,
  gitBinaryPath: string,
  name?: string,
  remote?: string
): Promise<void> {
  const remoteName = await resolveRemoteName(cwd, gitBinaryPath, remote)
  const trimmedName = name?.trim()

  if (trimmedName) {
    const tagRef = trimmedName.includes('/')
      ? trimmedName.slice(trimmedName.indexOf('/') + 1)
      : trimmedName
    await runGitOrThrow(['push', remoteName, tagRef], { cwd, gitBinaryPath })
    return
  }

  await runGitOrThrow(['push', remoteName, '--tags'], { cwd, gitBinaryPath })
}
