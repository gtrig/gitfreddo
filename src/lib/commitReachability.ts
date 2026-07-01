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

/** Commit is strictly ahead of HEAD on a shared history line. */
export function isAheadOfHead(
  commitHash: string,
  headHash: string,
  commits: GitCommit[]
): boolean {
  return isStrictAncestorOf(headHash, commitHash, commits)
}
