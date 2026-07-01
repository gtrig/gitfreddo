import type { GitCommit } from '@/lib/types'
import { formatAuthoredDateTooltip } from '@/lib/formatTimeSince'

export function formatCompactDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const day = date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
  return `${day} @ ${time}`
}

const SIGNATURE_LABELS: Record<string, string> = {
  G: 'Verified',
  B: 'Bad sig',
  U: 'Unknown',
  X: 'Expired',
  Y: 'Expired key',
  R: 'Revoked',
  E: 'Missing key',
  N: 'Unsigned'
}

export function formatCommitSignature(signature: string | null | undefined): string {
  if (!signature) return '—'
  return SIGNATURE_LABELS[signature] ?? signature
}

export function formatCommitParents(parentCount: number): string {
  if (parentCount === 0) return 'root'
  if (parentCount === 1) return '1'
  return `${parentCount} (merge)`
}

export function formatCommitRefs(refs: string[]): string {
  if (refs.length === 0) return '—'
  return refs.join(', ')
}

export function formatCommitBodyPreview(body: string): string {
  const trimmed = body.trim()
  if (!trimmed) return '—'
  return trimmed.replace(/\s+/g, ' ')
}

export function formatCommitLineStats(commit: GitCommit): string {
  const stats = commit.stats
  if (!stats) return '—'
  if (stats.insertions === 0 && stats.deletions === 0) {
    return stats.filesChanged > 0 ? '0/0' : '—'
  }
  return `+${stats.insertions}/-${stats.deletions}`
}

export function formatCommitFilesChanged(commit: GitCommit): string {
  const count = commit.stats?.filesChanged
  if (count === undefined || count === null) return '—'
  return String(count)
}

const ISSUE_PATTERNS = [/(?:^|\s)(#[0-9]+)/g, /\b([A-Z][A-Z0-9]+-[0-9]+)\b/g]

export function extractCommitIssueLinks(commit: GitCommit): string[] {
  const text = `${commit.subject}\n${commit.body}`
  const seen = new Set<string>()
  const results: string[] = []

  for (const pattern of ISSUE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const link = (match[1] ?? match[0]).trim()
      if (!seen.has(link)) {
        seen.add(link)
        results.push(link)
      }
    }
  }

  return results
}

export function formatCommitIssueLinks(commit: GitCommit): string {
  const links = extractCommitIssueLinks(commit)
  if (links.length === 0) return '—'
  return links.join(', ')
}

export function commitCellTitle(columnId: string, commit: GitCommit): string | undefined {
  switch (columnId) {
    case 'hash':
      return commit.hash
    case 'authoredDate':
      return formatAuthoredDateTooltip(commit.author.date)
    case 'committedDate':
      return formatAuthoredDateTooltip(commit.committer.date)
    case 'authorEmail':
      return commit.author.email
    case 'committer':
      return commit.committer.email
    default:
      return undefined
  }
}

export function commitCellContent(columnId: string, commit: GitCommit): string {
  switch (columnId) {
    case 'hash':
      return commit.shortHash
    case 'author':
      return commit.author.name || '—'
    case 'authorEmail':
      return commit.author.email || '—'
    case 'authoredDate':
      return formatCompactDate(commit.author.date)
    case 'parents':
      return formatCommitParents(commit.parents.length)
    case 'refs':
      return formatCommitRefs(commit.refs)
    case 'bodyPreview':
      return formatCommitBodyPreview(commit.body)
    case 'issueLinks':
      return formatCommitIssueLinks(commit)
    case 'committer':
      return commit.committer.name || '—'
    case 'committedDate':
      return formatCompactDate(commit.committer.date)
    case 'signature':
      return formatCommitSignature(commit.signature)
    case 'notes':
      return commit.notes.trim() || '—'
    case 'filesChanged':
      return formatCommitFilesChanged(commit)
    case 'lineStats':
      return formatCommitLineStats(commit)
    default:
      return '—'
  }
}
