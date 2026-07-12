import type { GitSubmoduleEntry } from '../../submodule-types'
import type { WorkingReadResult } from '../../working'

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
  isSubmodule?: boolean
  submoduleStatus?: import('../../submodule-types').SubmoduleEntryStatus
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

export interface GitMergeStatus {
  inProgress: boolean
  kind: 'merge' | 'rebase' | 'cherry-pick' | null
  conflictedPaths: string[]
  ours?: string
  theirs?: string
  currentBranch?: string
  incomingLabel?: string
  mergeMessage?: string
  oursCommit?: string
  theirsCommit?: string
}

export interface GitMergeStartResult {
  status: 'completed' | 'conflicts'
  conflictedPaths: string[]
}

export interface GitSquashMergeIntoResult {
  status: 'completed' | 'conflicts'
  conflictedPaths: string[]
  commitHash?: string
  targetBranch: string
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

export interface GitHook {
  name: string
  filename: string
  enabled: boolean
  executable: boolean
}

export interface GitHooksListResult {
  hooks: GitHook[]
  hooksDir: string
  alternateHooksDir?: string
  alternateHooksPath?: string
}

export interface GitDiffResult {
  unified: string
  path: string
}

export interface GitBlameLine {
  line: number
  hash: string
  shortHash: string
  author: string
  authorMail: string
  authorTime: string
  summary: string
  content: string
}

export interface GitReflogEntry {
  hash: string
  shortHash: string
  selector: string
  subject: string
  timestamp: string
}

export type UndoResetMode = 'soft' | 'mixed' | 'hard'

export interface UndoPeekResult {
  canUndo: boolean
  targetHash?: string
  targetShortHash?: string
  subject?: string
  mode?: UndoResetMode
  reason?: 'nothing-to-undo' | 'unsupported-action' | 'git-busy'
}

export interface UndoResult {
  targetHash: string
  targetShortHash: string
  subject: string
  mode: UndoResetMode
}

export interface GitBisectStatus {
  active: boolean
  good?: string
  bad?: string
  current?: string
  remaining?: number
}

export interface GitNoteEntry {
  hash: string
  note: string
}

export interface GitLogGraphResult {
  commits: GitCommit[]
  maxCount: number
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

export type { GitSubmoduleEntry, WorkingReadResult }
