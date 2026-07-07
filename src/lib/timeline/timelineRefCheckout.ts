import type { BranchCheckoutParams } from '@shared/git'
import { tagCheckoutRef } from '@/lib/format/tagNames'
import { detachedRefCheckoutParams, localBranchCheckoutParams } from '@/lib/git/branchCheckout'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

export type TimelineRefCheckoutAction =
  | { kind: 'ref'; params: BranchCheckoutParams }
  | { kind: 'remote'; remoteBranch: string }

export function resolveTimelineRefDoubleClickCheckout(
  timelineRef: TimelineRef,
  { isCurrent }: { isCurrent: boolean }
): TimelineRefCheckoutAction | null {
  if (isCurrent) return null

  switch (timelineRef.kind) {
    case 'branch':
      return { kind: 'ref', params: localBranchCheckoutParams(timelineRef.label) }
    case 'tag':
      return { kind: 'ref', params: detachedRefCheckoutParams(tagCheckoutRef(timelineRef.label)) }
    case 'remote':
      return { kind: 'remote', remoteBranch: `remotes/${timelineRef.label}` }
  }
}

export function resolveCommitDoubleClickCheckout(commitHash: string): BranchCheckoutParams {
  return detachedRefCheckoutParams(commitHash)
}
