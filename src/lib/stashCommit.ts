import type { GitCommit } from './types'

const INTERNAL_STASH_SUBJECT = /^(index|untracked) on /i

export function isStashRef(ref: string): boolean {
  const trimmed = ref.trim()
  const lower = trimmed.toLowerCase()
  if (lower === 'stash' || lower === 'refs/stash') return true
  if (/^refs\/stash@\{/.test(lower)) return true
  if (/^stash@\{/.test(lower)) return true
  return false
}

export function isStashCommit(commit: Pick<GitCommit, 'refs'>): boolean {
  return commit.refs.some(isStashRef)
}

/** Git's internal stash commits (index/untracked trees) — hidden from the timeline. */
export function isInternalStashCommit(commit: Pick<GitCommit, 'subject'>): boolean {
  return INTERNAL_STASH_SUBJECT.test(commit.subject.trim())
}

export function filterTimelineCommits(commits: GitCommit[]): GitCommit[] {
  return commits.filter((commit) => !isInternalStashCommit(commit))
}

/** The branch tip commit that was checked out when the stash was created. */
export function stashBaseParentHash(stash: Pick<GitCommit, 'parents'>): string | null {
  return stash.parents[0] ?? null
}
