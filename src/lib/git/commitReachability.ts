import type { GitCommit } from '@/lib/types'

export function commitByHash(commits: GitCommit[]): Map<string, GitCommit> {
  return new Map(commits.map((commit) => [commit.hash, commit]))
}

/** True when `ancestorHash` is reachable by walking parents from `descendantHash`. */
export function isAncestorOf(
  ancestorHash: string,
  descendantHash: string,
  commits: GitCommit[]
): boolean {
  if (ancestorHash === descendantHash) return true

  const byHash = commitByHash(commits)
  const visited = new Set<string>()
  const queue = [descendantHash]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === ancestorHash) return true
    if (visited.has(current)) continue
    visited.add(current)

    const commit = byHash.get(current)
    if (!commit) continue

    for (const parent of commit.parents) {
      queue.push(parent)
    }
  }

  return false
}

export function isStrictAncestorOf(
  ancestorHash: string,
  descendantHash: string,
  commits: GitCommit[]
): boolean {
  return (
    ancestorHash !== descendantHash &&
    isAncestorOf(ancestorHash, descendantHash, commits)
  )
}

/** Commit is on the current branch history (including HEAD). */
export function isOnCurrentBranchHistory(
  commitHash: string,
  headHash: string,
  commits: GitCommit[]
): boolean {
  return isAncestorOf(commitHash, headHash, commits)
}

/** Commit is strictly behind HEAD on the current branch. */
export function isBehindHead(
  commitHash: string,
  headHash: string,
  commits: GitCommit[]
): boolean {
  return isStrictAncestorOf(commitHash, headHash, commits)
}

/**
 * Set of `startHash` plus every commit reachable by walking parents from it.
 * Returns an empty set when `startHash` is falsy. Cycle-safe.
 */
export function collectAncestors(startHash: string, commits: GitCommit[]): Set<string> {
  const ancestors = new Set<string>()
  if (!startHash) return ancestors

  const byHash = commitByHash(commits)
  const queue = [startHash]

  while (queue.length > 0) {
    const current = queue.shift()!
    if (ancestors.has(current)) continue
    ancestors.add(current)

    const commit = byHash.get(current)
    if (!commit) continue

    for (const parent of commit.parents) {
      if (!ancestors.has(parent)) queue.push(parent)
    }
  }

  return ancestors
}

/**
 * Set of `startHash` plus every commit on its first-parent chain
 * (`git log --first-parent`). This stays on the current branch and excludes
 * side branches that were merged in via a merge commit's second+ parents.
 * Returns an empty set when `startHash` is falsy. Cycle-safe.
 */
export function collectFirstParentAncestors(
  startHash: string,
  commits: GitCommit[]
): Set<string> {
  const ancestors = new Set<string>()
  if (!startHash) return ancestors

  const byHash = commitByHash(commits)
  let current: string | undefined = startHash

  while (current && !ancestors.has(current)) {
    ancestors.add(current)
    const commit = byHash.get(current)
    current = commit?.parents[0]
  }

  return ancestors
}

/** Commit is strictly ahead of HEAD on a shared history line. */
export function isAheadOfHead(
  commitHash: string,
  headHash: string,
  commits: GitCommit[]
): boolean {
  return isStrictAncestorOf(headHash, commitHash, commits)
}
