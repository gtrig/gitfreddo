import type { GitHubPullRequestFile, GitHubPullRequestFileStatus } from '@shared/github'
import type { CommitFileChangeKind, CommitFileItem } from '@/lib/types'

export interface PullRequestFileStats {
  fileCount: number
  additions: number
  deletions: number
  changes: number
}

export function prFileStatusToKind(status: GitHubPullRequestFileStatus): CommitFileChangeKind {
  switch (status) {
    case 'added':
    case 'copied':
      return 'added'
    case 'removed':
      return 'removed'
    case 'modified':
    case 'renamed':
    case 'changed':
      return 'changed'
    default:
      return 'unchanged'
  }
}

export function mapPullRequestFilesToCommitItems(
  files: GitHubPullRequestFile[]
): CommitFileItem[] {
  return files.map((file) => ({
    path: file.path,
    kind: prFileStatusToKind(file.status)
  }))
}

export function sumPullRequestFileStats(files: GitHubPullRequestFile[]): PullRequestFileStats {
  return files.reduce(
    (acc, file) => ({
      fileCount: acc.fileCount + 1,
      additions: acc.additions + file.additions,
      deletions: acc.deletions + file.deletions,
      changes: acc.changes + file.changes
    }),
    { fileCount: 0, additions: 0, deletions: 0, changes: 0 }
  )
}

export interface PullRequestStatusMeta {
  labelKey: string
  tone: 'neutral' | 'success' | 'warning' | 'danger'
}

export function pullRequestStatusMeta(pr: {
  state: string
  draft: boolean
  mergeable: boolean | null
}): PullRequestStatusMeta {
  if (pr.state === 'closed') {
    return { labelKey: 'detail.pullRequest.statusClosed', tone: 'danger' }
  }
  if (pr.draft) {
    return { labelKey: 'detail.pullRequest.statusDraft', tone: 'neutral' }
  }
  if (pr.mergeable === true) {
    return { labelKey: 'detail.pullRequest.statusMergeable', tone: 'success' }
  }
  if (pr.mergeable === false) {
    return { labelKey: 'detail.pullRequest.statusConflicts', tone: 'warning' }
  }
  return { labelKey: 'detail.pullRequest.statusChecking', tone: 'neutral' }
}

export function pullRequestStatusClassName(tone: PullRequestStatusMeta['tone']): string {
  switch (tone) {
    case 'success':
      return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
    case 'warning':
      return 'border-amber-500/40 bg-amber-500/10 text-amber-300'
    case 'danger':
      return 'border-rose-500/40 bg-rose-500/10 text-rose-300'
    default:
      return 'border-gf-border bg-gf-surface text-gf-fg-muted'
  }
}
