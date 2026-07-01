export interface GitAuthor {
  name: string
  email: string
  date: string
}

export interface GitCommitStats {
  filesChanged: number
  insertions: number
  deletions: number
}

export interface GitCommit {
  hash: string
  shortHash: string
  parents: string[]
  message: string
  subject: string
  body: string
  author: GitAuthor
  committer: GitAuthor
  signature: string | null
  notes: string
  stats: GitCommitStats | null
  refs: string[]
}

export interface GitBranch {
  name: string
  head: string
  upstream?: string
  ahead: number
  behind: number
  isCurrent: boolean
  isRemote: boolean
}

export interface GitRemote {
  name: string
  url: string
  fetch: string
  push: string
}

export interface GitTag {
  name: string
  target: string
  message?: string
  isAnnotated: boolean
  isRemote: boolean
  remote?: string
  createdAt?: string
}

export type FileChangeStatus =
  | 'added'
  | 'modified'
  | 'deleted'
  | 'renamed'
  | 'copied'
  | 'untracked'
  | 'conflicted'

export interface GitFileChange {
  path: string
  status: FileChangeStatus
  oldPath?: string
}

export interface GitWorkingStatus {
  branch: string
  ahead: number
  behind: number
  staged: GitFileChange[]
  unstaged: GitFileChange[]
  untracked: GitFileChange[]
  conflicted: GitFileChange[]
  isClean: boolean
  mergeInProgress: boolean
  rebaseInProgress: boolean
  cherryPickInProgress: boolean
}

export interface GitStashEntry {
  index: number
  message: string
  branch: string
  hash: string
}

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

export interface MaintenancePruneResult {
  removedCommitCount: number
}

export interface StaleRetentionRef {
  ref: string
  label: string
  kind: 'branch' | 'backup' | 'remote' | 'tag' | 'other'
  head: string
  shortHash: string
  subject: string
  commitsNotOnHead: number
}

/** @deprecated Use StaleRetentionRef */
export type StaleLocalBranch = StaleRetentionRef & { name: string }

export interface StaleBranchSummary {
  refs: StaleRetentionRef[]
  branches: StaleRetentionRef[]
  totalCommitsNotOnHead: number
  matchingRefs: string[]
  matchingBranches: string[]
}

export interface RemoveStaleBranchesResult {
  deletedRefs: string[]
  deletedBranches: string[]
  removedCommitCount: number
}

export interface GitMergeStatus {
  inProgress: boolean
  kind: 'merge' | 'rebase' | 'cherry-pick' | null
  conflictedPaths: string[]
  ours?: string
  theirs?: string
}

export interface GitRepoStatus {
  path: string
  root: string
  head: string
  branch: string
  isDetached: boolean
  commonDir: string
  isLinkedWorktree: boolean
}

export interface GitWorktreeEntry {
  path: string
  head: string
  branch?: string
  isDetached: boolean
  isBare: boolean
  isMain: boolean
  locked?: string
  prunable?: string
}

export interface GitDiffResult {
  unified: string
  path: string
}

export interface GitLogGraphResult {
  commits: GitCommit[]
  maxCount: number
}

export type CommitFileChangeKind = 'added' | 'changed' | 'removed' | 'unchanged'

export interface TimelineSelection {
  kind: 'commit' | 'working'
  id: string
}

export type TimelineNodeKind = TimelineSelection['kind']

export interface HistoryEntry {
  id: string
  kind: 'commit'
  message: string
  created_at: string
  author?: { name?: string; email?: string }
  refs?: string[]
  parents?: string[]
}


export interface CommitFileItem {
  path: string
  kind: CommitFileChangeKind
}

export const BRANCH_COLORS = [
  'text-gf-accent-fg',
  'text-emerald-400',
  'text-amber-400',
  'text-violet-400',
  'text-rose-400',
  'text-cyan-400'
] as const

export function branchColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash + name.charCodeAt(i) * (i + 1)) % BRANCH_COLORS.length
  }
  return BRANCH_COLORS[hash] ?? BRANCH_COLORS[0]
}

export function statusLabel(status: FileChangeStatus): string {
  switch (status) {
    case 'added':
      return 'A'
    case 'modified':
      return 'M'
    case 'deleted':
      return 'D'
    case 'renamed':
      return 'R'
    case 'copied':
      return 'C'
    case 'untracked':
      return '?'
    case 'conflicted':
      return 'U'
    default:
      return '?'
  }
}

export function statusColor(status: FileChangeStatus): string {
  switch (status) {
    case 'added':
    case 'copied':
      return 'text-emerald-400'
    case 'modified':
      return 'text-amber-400'
    case 'deleted':
      return 'text-rose-400'
    case 'renamed':
      return 'text-violet-400'
    case 'untracked':
      return 'text-gf-fg-subtle'
    case 'conflicted':
      return 'text-orange-400'
    default:
      return 'text-gf-fg-muted'
  }
}
