import { commitByHash } from '@/lib/git/commitReachability'
import type { GitBranch, GitCommit } from '@/lib/types'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

export function branchVisibilityKey(branch: Pick<GitBranch, 'name'>): string {
  return branch.name
}

export function timelineRefVisibilityKey(ref: TimelineRef): string {
  if (ref.kind === 'remote') {
    return `remotes/${ref.label}`
  }
  return ref.label
}

function collectReachableCommits(tips: string[], commits: GitCommit[]): Set<string> {
  const byHash = commitByHash(commits)
  const reachable = new Set<string>()
  const queue = [...tips]

  while (queue.length > 0) {
    const hash = queue.shift()!
    if (reachable.has(hash)) continue
    reachable.add(hash)

    const entry = byHash.get(hash)
    if (!entry) continue

    for (const parent of entry.parents) {
      queue.push(parent)
    }
  }

  return reachable
}

function visibleBranchTips(
  branches: GitBranch[],
  hidden: ReadonlySet<string>,
  head: string
): string[] {
  const tips = new Set<string>()
  if (head) tips.add(head)

  for (const branch of branches) {
    if (branch.isCurrent) {
      tips.add(branch.head)
      continue
    }
    if (hidden.has(branchVisibilityKey(branch))) continue
    tips.add(branch.head)
  }

  return [...tips]
}

export function filterCommitsForVisibleBranches(
  commits: GitCommit[],
  branches: GitBranch[],
  hidden: ReadonlySet<string>,
  head: string
): GitCommit[] {
  if (hidden.size === 0) return commits

  const reachable = collectReachableCommits(
    visibleBranchTips(branches, hidden, head),
    commits
  )

  return commits.filter((commit) => reachable.has(commit.hash))
}

export function filterTimelineRefsForVisibility(
  refs: TimelineRef[],
  hidden: ReadonlySet<string>
): TimelineRef[] {
  if (hidden.size === 0) return refs

  return refs.filter((ref) => {
    if (ref.kind === 'tag') return true
    return !hidden.has(timelineRefVisibilityKey(ref))
  })
}
