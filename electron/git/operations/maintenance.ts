import {
  buildForEachRefAllRefsArgs,
  buildGcPruneArgs,
  buildReflogExpireArgs,
  buildRevListCountNotHeadArgs,
  buildRevParseCommitArgs,
  buildRevParseHeadArgs,
  buildShowCommitSummaryArgs,
  buildSymbolicRefHeadArgs,
  buildUpdateRefDeleteArgs,
  fsckUnreachable,
  mergeBaseIsAncestor,
  revListCountNotHeadFromRef
} from '../../../shared/git/commands'
import { runCommand, runGitOrThrow } from '../git-runner'
import { branchDelete } from './branch'

export interface UnreachableCommit {
  hash: string
  shortHash: string
  subject: string
  authorDate: string
}

export interface UnreachableSummary {
  commits: UnreachableCommit[]
  totalCommitCount: number
  blobCount: number
  treeCount: number
}

export type StaleRefKind = 'branch' | 'backup' | 'remote' | 'tag' | 'other'

export interface StaleRetentionRef {
  ref: string
  label: string
  kind: StaleRefKind
  head: string
  shortHash: string
  subject: string
  commitsNotOnHead: number
}

/** @deprecated Use StaleRetentionRef */
export type StaleLocalBranch = StaleRetentionRef & { name: string }

export interface StaleBranchSummary {
  refs: StaleRetentionRef[]
  /** @deprecated Use refs */
  branches: StaleLocalBranch[]
  totalCommitsNotOnHead: number
  matchingRefs: string[]
  /** @deprecated Use matchingRefs */
  matchingBranches: string[]
}

export interface PruneResult {
  removedCommitCount: number
}

export interface RemoveStaleBranchesResult {
  deletedRefs: string[]
  /** @deprecated Use deletedRefs */
  deletedBranches: string[]
  removedCommitCount: number
}

const PREVIEW_LIMIT = 100

const FSCK_COMMIT_RE = /^unreachable commit ([0-9a-f]{40})$/i
const FSCK_BLOB_RE = /^unreachable blob /i
const FSCK_TREE_RE = /^unreachable tree /i

export function classifyRef(ref: string): StaleRefKind {
  if (ref.startsWith('refs/heads/')) return 'branch'
  if (ref.startsWith('refs/original/')) return 'backup'
  if (ref.startsWith('refs/remotes/')) return 'remote'
  if (ref.startsWith('refs/tags/')) return 'tag'
  return 'other'
}

export function formatRefLabel(ref: string): string {
  if (ref.startsWith('refs/heads/')) return ref.slice('refs/heads/'.length)
  if (ref.startsWith('refs/original/')) {
    return `${ref.slice('refs/original/'.length)} (backup)`
  }
  if (ref.startsWith('refs/remotes/')) return `${ref.slice('refs/remotes/'.length)} (remote)`
  if (ref.startsWith('refs/tags/')) return `${ref.slice('refs/tags/'.length)} (tag)`
  return ref.replace(/^refs\//, '')
}

export function toStaleBranchSummary(refs: StaleRetentionRef[], matchingRefs: string[], total: number): StaleBranchSummary {
  const withLegacyName = refs.map((entry) => ({ ...entry, name: entry.label }))
  return {
    refs,
    branches: withLegacyName,
    totalCommitsNotOnHead: total,
    matchingRefs,
    matchingBranches: matchingRefs
  }
}

export function parseFsckUnreachable(stdout: string): {
  commitHashes: string[]
  blobCount: number
  treeCount: number
} {
  const commitHashes: string[] = []
  let blobCount = 0
  let treeCount = 0

  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    const commitMatch = trimmed.match(FSCK_COMMIT_RE)
    if (commitMatch) {
      commitHashes.push(commitMatch[1]!.toLowerCase())
      continue
    }
    if (FSCK_BLOB_RE.test(trimmed)) {
      blobCount++
      continue
    }
    if (FSCK_TREE_RE.test(trimmed)) {
      treeCount++
    }
  }

  return { commitHashes, blobCount, treeCount }
}

async function runFsckUnreachable(cwd: string, gitBinaryPath: string): Promise<string> {
  const result = await runCommand(fsckUnreachable, undefined as never, { cwd, gitBinaryPath })
  if (result.code !== 0 && !result.stdout.trim()) {
    throw new Error(result.stderr.trim() || 'git fsck failed')
  }
  return result.stdout
}

async function commitDetails(
  cwd: string,
  gitBinaryPath: string,
  hash: string
): Promise<UnreachableCommit> {
  const out = await runGitOrThrow(buildShowCommitSummaryArgs(hash), { cwd, gitBinaryPath })
  const [fullHash, shortHash, subject, authorDate] = out.trim().split('\n')
  return {
    hash: fullHash ?? hash,
    shortHash: shortHash ?? hash.slice(0, 7),
    subject: subject ?? '(no subject)',
    authorDate: authorDate ?? ''
  }
}

export async function listUnreachableCommits(
  cwd: string,
  gitBinaryPath: string
): Promise<UnreachableSummary> {
  const stdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const { commitHashes, blobCount, treeCount } = parseFsckUnreachable(stdout)

  const previewHashes = commitHashes.slice(0, PREVIEW_LIMIT)
  const commits: UnreachableCommit[] = []

  for (const hash of previewHashes) {
    try {
      commits.push(await commitDetails(cwd, gitBinaryPath, hash))
    } catch {
      commits.push({
        hash,
        shortHash: hash.slice(0, 7),
        subject: '(unreadable commit)',
        authorDate: ''
      })
    }
  }

  return {
    commits,
    totalCommitCount: commitHashes.length,
    blobCount,
    treeCount
  }
}

export async function pruneStaleObjects(
  cwd: string,
  gitBinaryPath: string
): Promise<PruneResult> {
  const beforeStdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const beforeCount = parseFsckUnreachable(beforeStdout).commitHashes.length

  await runGitOrThrow(buildReflogExpireArgs(), { cwd, gitBinaryPath })
  await runGitOrThrow(buildGcPruneArgs(), { cwd, gitBinaryPath })

  const afterStdout = await runFsckUnreachable(cwd, gitBinaryPath)
  const afterCount = parseFsckUnreachable(afterStdout).commitHashes.length

  return { removedCommitCount: Math.max(0, beforeCount - afterCount) }
}

async function resolveHead(cwd: string, gitBinaryPath: string): Promise<string> {
  return (await runGitOrThrow(buildRevParseHeadArgs(), { cwd, gitBinaryPath })).trim()
}

async function resolveHeadRef(cwd: string, gitBinaryPath: string): Promise<string> {
  return (await runGitOrThrow(buildSymbolicRefHeadArgs(), { cwd, gitBinaryPath })).trim()
}

async function countCommitsNotOnHead(cwd: string, gitBinaryPath: string): Promise<number> {
  const out = await runGitOrThrow(buildRevListCountNotHeadArgs(), { cwd, gitBinaryPath })
  return Number.parseInt(out.trim(), 10) || 0
}

function hashMatches(stored: string, target: string): boolean {
  const normalized = target.toLowerCase()
  const candidate = stored.toLowerCase()
  return normalized.startsWith(candidate) || candidate.startsWith(normalized)
}

interface ParsedRef {
  ref: string
  objectId: string
}

async function listCommitRefs(cwd: string, gitBinaryPath: string): Promise<ParsedRef[]> {
  const stdout = await runGitOrThrow(buildForEachRefAllRefsArgs(), { cwd, gitBinaryPath })

  const refs: ParsedRef[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    const [ref, objectType, objectId] = trimmed.split(/\s+/)
    if (!ref || !objectId) continue

    if (objectType === 'tag') {
      try {
        const peeled = (
          await runGitOrThrow(buildRevParseCommitArgs(ref), { cwd, gitBinaryPath })
        ).trim()
        refs.push({ ref, objectId: peeled })
      } catch {
        // not a commit tag
      }
      continue
    }

    if (objectType === 'commit') {
      refs.push({ ref, objectId })
    }
  }

  return refs
}

async function exclusiveCommitCount(
  cwd: string,
  gitBinaryPath: string,
  ref: string
): Promise<number> {
  const out = await runCommand(revListCountNotHeadFromRef, { ref }, { cwd, gitBinaryPath })
  if (out.code !== 0) return 0
  return Number.parseInt(out.stdout.trim(), 10) || 0
}

export async function findRefsForCommits(
  cwd: string,
  gitBinaryPath: string,
  hashes: string[]
): Promise<string[]> {
  if (hashes.length === 0) return []

  const head = await resolveHead(cwd, gitBinaryPath)
  const refs = await listCommitRefs(cwd, gitBinaryPath)
  const matched = new Set<string>()

  for (const entry of refs) {
    if (hashes.some((hash) => hashMatches(entry.objectId, hash))) {
      matched.add(entry.ref)
      continue
    }

    for (const hash of hashes) {
      const onRef = await runCommand(
        mergeBaseIsAncestor,
        { ancestor: hash, descendant: entry.objectId },
        { cwd, gitBinaryPath }
      )
      if (onRef.code !== 0) continue

      const onHead = await runCommand(
        mergeBaseIsAncestor,
        { ancestor: hash, descendant: head },
        { cwd, gitBinaryPath }
      )
      if (onHead.code !== 0) {
        matched.add(entry.ref)
        break
      }
    }
  }

  return [...matched]
}

/** @deprecated Use findRefsForCommits */
export const findLocalBranchesForCommits = findRefsForCommits

export async function listStaleLocalBranches(
  cwd: string,
  gitBinaryPath: string,
  matchingHashes: string[] = []
): Promise<StaleBranchSummary> {
  const refs = await listCommitRefs(cwd, gitBinaryPath)
  const staleRefs: StaleRetentionRef[] = []

  for (const entry of refs) {
    const commitsNotOnHead = await exclusiveCommitCount(cwd, gitBinaryPath, entry.ref)
    if (commitsNotOnHead === 0) continue

    const details = await commitDetails(cwd, gitBinaryPath, entry.objectId)
    staleRefs.push({
      ref: entry.ref,
      label: formatRefLabel(entry.ref),
      kind: classifyRef(entry.ref),
      head: entry.objectId,
      shortHash: details.shortHash,
      subject: details.subject,
      commitsNotOnHead
    })
  }

  staleRefs.sort((a, b) => b.commitsNotOnHead - a.commitsNotOnHead)

  const matchingRefs =
    matchingHashes.length > 0
      ? await findRefsForCommits(cwd, gitBinaryPath, matchingHashes)
      : []

  return toStaleBranchSummary(
    staleRefs,
    matchingRefs,
    await countCommitsNotOnHead(cwd, gitBinaryPath)
  )
}

async function deleteRef(cwd: string, gitBinaryPath: string, ref: string): Promise<void> {
  if (ref.startsWith('refs/heads/')) {
    const name = ref.slice('refs/heads/'.length)
    await branchDelete(cwd, gitBinaryPath, name, true)
    return
  }

  await runGitOrThrow(buildUpdateRefDeleteArgs(ref), { cwd, gitBinaryPath })
}

export async function removeStaleBranches(
  cwd: string,
  gitBinaryPath: string,
  branchNames: string[]
): Promise<RemoveStaleBranchesResult> {
  const refs = branchNames.map((name) =>
    name.startsWith('refs/') ? name : `refs/heads/${name}`
  )
  return removeStaleRefs(cwd, gitBinaryPath, refs)
}

export async function removeStaleRefs(
  cwd: string,
  gitBinaryPath: string,
  refs: string[]
): Promise<RemoveStaleBranchesResult> {
  if (refs.length === 0) {
    throw new Error('Select at least one reference to remove.')
  }

  const headRef = await resolveHeadRef(cwd, gitBinaryPath)
  if (refs.includes(headRef)) {
    throw new Error('Cannot delete the currently checked-out branch reference.')
  }

  const beforeCount = await countCommitsNotOnHead(cwd, gitBinaryPath)
  const deletedRefs: string[] = []

  for (const ref of refs) {
    await deleteRef(cwd, gitBinaryPath, ref)
    deletedRefs.push(ref)
  }

  await runGitOrThrow(buildReflogExpireArgs(), { cwd, gitBinaryPath })
  await runGitOrThrow(buildGcPruneArgs(), { cwd, gitBinaryPath })

  const afterCount = await countCommitsNotOnHead(cwd, gitBinaryPath)

  return {
    deletedRefs,
    deletedBranches: deletedRefs,
    removedCommitCount: Math.max(0, beforeCount - afterCount)
  }
}
