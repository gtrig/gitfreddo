import { GIT_IPC_METHODS } from './git/ipc/methods'

export type RepoChangeScope = 'working' | 'refs'

export interface RepoChangeEvent {
  repoPath: string
  scope: RepoChangeScope
}

/** Query suffixes refreshed when `.git` metadata changes (commits, refs, merges). */
export const REPO_CHANGE_REFS_QUERY_SUFFIXES = [
  'status',
  'working.status',
  'branch.list',
  'log.graph',
  'remote.list',
  'stash.list',
  'tag.list',
  'submodule.list',
  'merge.status'
] as const

/** Query suffixes refreshed when worktree files change. */
export const REPO_CHANGE_WORKING_QUERY_SUFFIXES = ['working.status'] as const

/** Diff-related query suffixes tied to working tree edits. */
export const REPO_CHANGE_WORKING_DIFF_SUFFIXES = [
  'diff.working',
  'diff.staged',
  'conflict.stages'
] as const

export function isRepoChangeDiffQuerySuffix(suffix: unknown): boolean {
  return (
    typeof suffix === 'string' &&
    (REPO_CHANGE_WORKING_DIFF_SUFFIXES as readonly string[]).includes(suffix)
  )
}

/** All query suffixes invalidated by at least one git IPC mutation. */
export function allGitIpcInvalidationSuffixes(): string[] {
  const suffixes = new Set<string>()
  for (const meta of Object.values(GIT_IPC_METHODS)) {
    for (const suffix of meta.invalidates) {
      suffixes.add(suffix)
    }
  }
  return [...suffixes].sort()
}
