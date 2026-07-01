import type { GitCommit } from '@/lib/types'
import { commitByHash, isOnCurrentBranchHistory } from '@/lib/commitReachability'

/** Commits between two rows in timeline display order (inclusive). */
export function commitRangeInTimeline(
  commits: GitCommit[],
  fromHash: string,
  toHash: string
): string[] {
  const fromIndex = commits.findIndex((commit) => commit.hash === fromHash)
  const toIndex = commits.findIndex((commit) => commit.hash === toHash)

  if (fromIndex === -1 || toIndex === -1) {
    return [toHash]
  }

  const start = Math.min(fromIndex, toIndex)
  const end = Math.max(fromIndex, toIndex)
  return commits.slice(start, end + 1).map((commit) => commit.hash)
}

/** Selected commits in timeline order (newest first). */
export function selectedCommitsInTimeline(
  commits: GitCommit[],
  selectedHashes: string[]
): GitCommit[] {
  const selected = new Set(selectedHashes)
  return commits.filter((commit) => selected.has(commit.hash))
}

/** Selected commits oldest-first (for cherry-pick and squash). */
export function selectedCommitsChronological(
  commits: GitCommit[],
  selectedHashes: string[]
): GitCommit[] {
  return selectedCommitsInTimeline(commits, selectedHashes).reverse()
}

/** True when each commit's first parent is the previous commit in the list. */
export function areContiguousCommits(chronological: GitCommit[]): boolean {
  if (chronological.length < 2) return false

  for (let index = 0; index < chronological.length - 1; index += 1) {
    const current = chronological[index]!
    const next = chronological[index + 1]!
    if (!next.parents.includes(current.hash)) {
      return false
    }
  }

  return true
}

export function selectionHasMergeCommit(selected: GitCommit[]): boolean {
  return selected.some((commit) => commit.parents.length > 1)
}

/** First-parent chain from HEAD (newest to oldest). */
export function firstParentChainFromHead(head: string, commits: GitCommit[]): GitCommit[] {
  const byHash = commitByHash(commits)
  const chain: GitCommit[] = []
  let current: string | undefined = head
  const visited = new Set<string>()

  while (current && !visited.has(current)) {
    visited.add(current)
    const commit = byHash.get(current)
    if (!commit) break
    chain.push(commit)
    current = commit.parents[0]
  }

  return chain
}

/**
 * True when every selected commit lies on the first-parent line from HEAD
 * and forms a consecutive segment of that line (required for rebase drop).
 */
export function areContiguousOnBranchHeadLine(
  selected: GitCommit[],
  head: string,
  allCommits: GitCommit[]
): boolean {
  if (selected.length === 0) return false
  if (selected.length === 1) {
    return isOnCurrentBranchHistory(selected[0]!.hash, head, allCommits)
  }

  const chainHashes = firstParentChainFromHead(head, allCommits).map((commit) => commit.hash)
  const selectedSet = new Set(selected.map((commit) => commit.hash))
  const indices = chainHashes
    .map((hash, index) => (selectedSet.has(hash) ? index : -1))
    .filter((index) => index >= 0)

  if (indices.length !== selected.length) return false

  indices.sort((a, b) => a - b)
  for (let index = 1; index < indices.length; index += 1) {
    if (indices[index] !== indices[index - 1]! + 1) return false
  }

  return true
}

export function allSelectedOnBranchHistory(
  selected: GitCommit[],
  head: string,
  commits: GitCommit[]
): boolean {
  return selected.every((commit) => isOnCurrentBranchHistory(commit.hash, head, commits))
}

export function anySelectedOnBranchHistory(
  selected: GitCommit[],
  head: string,
  commits: GitCommit[]
): boolean {
  return selected.some((commit) => isOnCurrentBranchHistory(commit.hash, head, commits))
}

export function toggleHashInList(hashes: string[], hash: string): string[] {
  if (hashes.includes(hash)) {
    return hashes.filter((item) => item !== hash)
  }
  return [...hashes, hash]
}

export function commitRowHighlightClass(isSelected: boolean, isPrimary: boolean): string {
  if (isPrimary) return 'bg-gf-accent/20'
  if (isSelected) return 'bg-gf-accent/10'
  return ''
}
