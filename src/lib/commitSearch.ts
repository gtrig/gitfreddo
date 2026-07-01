import type { GitCommit } from './types'

export const COMMIT_SEARCH_FADE_CLASS = 'transition-opacity duration-300 ease-out'

export function commitMatchesSearch(commit: GitCommit, query: string): boolean {
  const trimmed = query.trim().toLowerCase()
  if (!trimmed) return true

  const haystack = `${commit.subject}\n${commit.message}`.toLowerCase()
  return haystack.includes(trimmed)
}

export function filterCommitsByMessage(commits: GitCommit[], query: string): GitCommit[] {
  return commits.filter((commit) => commitMatchesSearch(commit, query))
}

/** Hashes to dim when a search is active; null when search is inactive. */
export function commitSearchDimmedHashes(commits: GitCommit[], query: string): Set<string> | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  return new Set(
    commits.filter((commit) => !commitMatchesSearch(commit, query)).map((commit) => commit.hash)
  )
}

export function commitSearchRowDimClass(
  dimmedHashes: Set<string> | null,
  hash: string,
  isSelected: boolean,
  isPrimary: boolean
): string {
  const dimmed = Boolean(dimmedHashes?.has(hash) && !isSelected && !isPrimary)
  return `${COMMIT_SEARCH_FADE_CLASS} ${dimmed ? 'opacity-35' : 'opacity-100'}`
}
