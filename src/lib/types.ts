/**
 * Renderer-side type hub.
 *
 * Git result shapes live in @shared/git/ipc (single source of truth).
 * This file re-exports those and adds renderer-only utilities and UI types.
 */
export type {
  GitAuthor,
  GitCommitStats,
  GitCommit,
  GitBranch,
  GitRemote,
  GitTag,
  FileChangeStatus,
  GitFileChange,
  GitWorkingStatus,
  GitStashEntry,
  GitMergeStatus,
  GitMergeStartResult,
  GitRepoStatus,
  GitWorktreeEntry,
  GitHook,
  GitHooksListResult,
  GitDiffResult,
  GitBlameLine,
  GitReflogEntry,
  GitLogGraphResult,
  UnreachableCommit,
  UnreachableSummary,
  MaintenancePruneResult,
  StaleRetentionRef,
  StaleBranchSummary,
  RemoveStaleBranchesResult,
  GitBisectStatus,
  UndoResult,
  UndoResetMode
} from '@shared/git/ipc'

export type {
  GitSubmoduleEntry,
  SubmoduleEntryStatus,
  SubmoduleRecursion,
  PushSubmoduleRecursion
} from '@shared/submodule'

/** @deprecated Use UndoResult from @shared/git/ipc */
export type { UndoResult as GitUndoResult } from '@shared/git/ipc'

/** @deprecated Use GitNoteEntry from @shared/git/ipc */
export type { GitNoteEntry as GitNote } from '@shared/git/ipc'

/** @deprecated Use StaleRetentionRef */
import type { FileChangeStatus, StaleRetentionRef } from '@shared/git/ipc'
export type StaleLocalBranch = StaleRetentionRef & { name: string }

// ---------------------------------------------------------------------------
// Renderer-only types (not in shared)
// ---------------------------------------------------------------------------

export type CommitFileChangeKind = 'added' | 'changed' | 'removed' | 'unchanged'

export interface TimelineSelection {
  kind: 'commit' | 'working' | 'merge'
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
  'text-gf-ref-branch-0',
  'text-gf-ref-branch-1',
  'text-gf-ref-branch-2',
  'text-gf-ref-branch-3',
  'text-gf-ref-branch-4',
  'text-gf-ref-branch-5'
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
