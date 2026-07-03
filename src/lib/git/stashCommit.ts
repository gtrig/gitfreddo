import type { GitCommit, GitStashEntry } from '@/lib/types'

const INTERNAL_STASH_SUBJECT = /^(index|untracked) on /i
const STASH_BASE_SHORT_HASH = /^(?:WIP )?on [^:]+: ([0-9a-f]{7,40})\b/i

export function isStashRef(ref: string): boolean {
  const trimmed = ref.trim()
  const lower = trimmed.toLowerCase()
  if (lower === 'stash' || lower === 'refs/stash') return true
  if (/^refs\/stash@\{/.test(lower)) return true
  if (/^stash@\{/.test(lower)) return true
  return false
}

export function isStashCommit(commit: Pick<GitCommit, 'refs'>): boolean {
  return commit.refs.some(isStashRef)
}

export function stashRefIndex(commit: Pick<GitCommit, 'refs'>): number | null {
  for (const ref of commit.refs) {
    const trimmed = ref.trim()
    const match =
      trimmed.match(/^refs\/stash@\{(\d+)\}$/i) ?? trimmed.match(/^stash@\{(\d+)\}$/i)
    if (match) return Number(match[1])
  }
  return null
}

export function resolveStashEntry(
  commit: GitCommit,
  stashes: GitStashEntry[] | undefined
): GitStashEntry | null {
  if (!stashes?.length) return null

  const byHash = stashes.find((stash) => stash.hash === commit.hash)
  if (byHash) return byHash

  const index = stashRefIndex(commit)
  if (index === null) return null
  return stashes.find((stash) => stash.index === index) ?? null
}

/** Git's internal stash commits (index/untracked trees) — hidden from the timeline. */
export function isInternalStashCommit(commit: Pick<GitCommit, 'subject'>): boolean {
  return INTERNAL_STASH_SUBJECT.test(commit.subject.trim())
}

export function filterTimelineCommits(commits: GitCommit[]): GitCommit[] {
  return commits.filter((commit) => !isInternalStashCommit(commit))
}

/** The branch tip commit that was checked out when the stash was created. */
export function stashBaseParentHash(stash: Pick<GitCommit, 'parents'>): string | null {
  return stash.parents[0] ?? null
}

function hashMatchesPrefix(full: string, prefix: string): boolean {
  const normalized = full.toLowerCase()
  const needle = prefix.toLowerCase()
  return normalized.startsWith(needle) || needle.startsWith(normalized.slice(0, needle.length))
}

/** Subject text after the embedded short hash in a stash message. */
export function stashMessageSubject(stashSubject: string): string | null {
  const match = stashSubject.trim().match(/^(?:WIP )?on [^:]+: [0-9a-f]{7,40}\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

/**
 * Resolves the timeline row to anchor a stash pad to.
 * Falls back to the message short hash or subject when the parent commit was rewritten.
 */
export function resolveStashAnchorHash(
  stash: Pick<GitCommit, 'parents' | 'subject'>,
  commits: GitCommit[],
  head?: string | null
): string | null {
  const parent = stash.parents[0] ?? null
  const byHash = new Map(commits.map((commit) => [commit.hash, commit]))

  const onHeadHistory = (hash: string): boolean => {
    if (!head) return false
    let current: string | undefined = head
    const visited = new Set<string>()
    while (current && !visited.has(current)) {
      visited.add(current)
      if (current === hash) return true
      current = byHash.get(current)?.parents[0]
    }
    return false
  }

  const preferHeadMatch = (matches: GitCommit[]): string | null => {
    if (matches.length === 0) return null
    const onHead = matches.find((commit) => onHeadHistory(commit.hash))
    return (onHead ?? matches[0])!.hash
  }

  if (parent && byHash.has(parent) && onHeadHistory(parent)) {
    return parent
  }

  const shortHash = stash.subject.trim().match(STASH_BASE_SHORT_HASH)?.[1]
  if (shortHash) {
    const byShort = commits.filter((commit) => hashMatchesPrefix(commit.hash, shortHash))
    const resolved = preferHeadMatch(byShort)
    if (resolved) return resolved
  }

  const subject = stashMessageSubject(stash.subject)
  if (subject) {
    const bySubject = commits.filter(
      (commit) => !isStashCommit(commit) && commit.subject.trim() === subject
    )
    const resolved = preferHeadMatch(bySubject)
    if (resolved) return resolved
  }

  if (parent && byHash.has(parent)) {
    return parent
  }

  if (parent) {
    const byParentPrefix = commits.find((commit) => hashMatchesPrefix(commit.hash, parent))
    if (byParentPrefix) return byParentPrefix.hash
  }

  return null
}
