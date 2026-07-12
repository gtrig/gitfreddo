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

export interface GitFileChange {
  path: string
  status: 'added' | 'modified' | 'deleted' | 'renamed' | 'copied' | 'untracked' | 'conflicted'
  oldPath?: string
  isSubmodule?: boolean
  submoduleStatus?: import('../../shared/submodule').SubmoduleEntryStatus
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

export type { GitSubmoduleEntry, SubmoduleEntryStatus } from '../../shared/submodule'

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

export interface GitLogGraphResult {
  commits: GitCommit[]
  maxCount: number
}
