import {
  buildPushDeleteTagArgs,
  buildPushTagArgs,
  buildTagCreateArgs,
  buildTagDeleteArgs,
  buildTagListArgs,
  buildTagRenameArgs
} from '../../../shared/git/commands'
import { runGitOrThrow } from '../git-runner'
import { resolveRemoteName } from './remote'
import type { GitTag } from '../types'

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

const TAG_FIELD_SEPARATOR = '\t'

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
  const stdout = await runGitOrThrow(buildTagListArgs(), { cwd, gitBinaryPath })

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
  message?: string,
  sign = false
): Promise<void> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Tag name is required.')
  }

  const trimmedMessage = message?.trim()
  if (sign && !trimmedMessage) {
    throw new Error('Signing requires an annotated tag message.')
  }

  await runGitOrThrow(
    buildTagCreateArgs({
      name: trimmedName,
      target: target?.trim(),
      message: trimmedMessage,
      sign
    }),
    { cwd, gitBinaryPath }
  )
}

function resolveLocalTagName(name: string): string {
  return name.includes('/') ? name.slice(name.indexOf('/') + 1) : name
}

export async function tagDelete(
  cwd: string,
  gitBinaryPath: string,
  name: string,
  remote?: string,
  alsoDeleteRemote?: boolean
): Promise<void> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Tag name is required.')
  }

  const tagRef = resolveLocalTagName(trimmedName)
  const deleteLocal = !remote?.trim() || Boolean(alsoDeleteRemote)
  const deleteRemote = (Boolean(remote?.trim()) && !alsoDeleteRemote) || Boolean(alsoDeleteRemote)

  if (deleteLocal) {
    await runGitOrThrow(buildTagDeleteArgs(tagRef), { cwd, gitBinaryPath })
  }

  if (deleteRemote) {
    const remoteName = await resolveRemoteName(cwd, gitBinaryPath, remote)
    await runGitOrThrow(buildPushDeleteTagArgs({ remote: remoteName, tag: tagRef }), {
      cwd,
      gitBinaryPath
    })
  }
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
    await runGitOrThrow(buildPushTagArgs({ remote: remoteName, tag: tagRef }), {
      cwd,
      gitBinaryPath
    })
    return
  }

  await runGitOrThrow(buildPushTagArgs({ remote: remoteName, allTags: true }), {
    cwd,
    gitBinaryPath
  })
}

export async function tagRename(
  cwd: string,
  gitBinaryPath: string,
  oldName: string,
  newName: string
): Promise<void> {
  const localOld = oldName.includes('/') ? oldName.slice(oldName.indexOf('/') + 1) : oldName
  await runGitOrThrow(buildTagRenameArgs({ oldName: localOld, newName: newName.trim() }), {
    cwd,
    gitBinaryPath
  })
}
