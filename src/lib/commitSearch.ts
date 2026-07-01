import type { GitCommit } from './types'

export const COMMIT_SEARCH_FADE_CLASS = 'transition-opacity duration-300 ease-out'

export interface CommitSearchFilters {
  query: string
  author?: string
  hashPrefix?: string
  dateFrom?: string
  dateTo?: string
}

function parseFilterDate(value: string, endOfDay: boolean): Date | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const parsed = new Date(`${trimmed}T${endOfDay ? '23:59:59.999' : '00:00:00'}`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function commitMatchesSearch(
  commit: GitCommit,
  filters: CommitSearchFilters | string
): boolean {
  const normalized: CommitSearchFilters =
    typeof filters === 'string' ? { query: filters } : filters

  const query = normalized.query.trim().toLowerCase()
  const author = normalized.author?.trim().toLowerCase() ?? ''
  const hashPrefix = normalized.hashPrefix?.trim().toLowerCase() ?? ''
  const from = normalized.dateFrom ? parseFilterDate(normalized.dateFrom, false) : null
  const to = normalized.dateTo ? parseFilterDate(normalized.dateTo, true) : null

  const active = query || author || hashPrefix || from || to
  if (!active) return true

  if (query) {
    const haystack = `${commit.subject}\n${commit.message}`.toLowerCase()
    if (!haystack.includes(query)) return false
  }

  if (author) {
    const authorHaystack = `${commit.author.name} ${commit.author.email}`.toLowerCase()
    if (!authorHaystack.includes(author)) return false
  }

  if (hashPrefix && !commit.hash.toLowerCase().startsWith(hashPrefix)) {
    return false
  }

  if (from || to) {
    const authored = new Date(commit.author.date)
    if (Number.isNaN(authored.getTime())) return false
    if (from && authored < from) return false
    if (to && authored > to) return false
  }

  return true
}

export function filterCommitsByMessage(commits: GitCommit[], filters: CommitSearchFilters | string): GitCommit[] {
  return commits.filter((commit) => commitMatchesSearch(commit, filters))
}

/** Hashes to dim when a search is active; null when search is inactive. */
export function commitSearchDimmedHashes(
  commits: GitCommit[],
  filters: CommitSearchFilters | string
): Set<string> | null {
  const normalized: CommitSearchFilters =
    typeof filters === 'string' ? { query: filters } : filters

  const active =
    normalized.query.trim().length > 0 ||
    Boolean(normalized.author?.trim()) ||
    Boolean(normalized.hashPrefix?.trim()) ||
    Boolean(normalized.dateFrom?.trim()) ||
    Boolean(normalized.dateTo?.trim())

  if (!active) return null

  return new Set(
    commits.filter((commit) => !commitMatchesSearch(commit, normalized)).map((commit) => commit.hash)
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
