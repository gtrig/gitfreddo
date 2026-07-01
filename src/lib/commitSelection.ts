import type { GitCommit } from '@/lib/types'

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
