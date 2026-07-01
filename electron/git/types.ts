export interface GitAuthor {
  name: string
  email: string
  date: string
}

export interface GitCommit {
  hash: string
  shortHash: string
  parents: string[]
  message: string
  subject: string
  author: GitAuthor
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
}

export interface GitDiffResult {
  unified: string
  path: string
}

export interface GitLogGraphResult {
  commits: GitCommit[]
  maxCount: number
}
