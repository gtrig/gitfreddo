import { tagCheckoutRef } from '@/lib/format/tagNames'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'

export type TimelineRefCheckoutAction =
  | { kind: 'ref'; ref: string }
  | { kind: 'remote'; remoteBranch: string }

export function resolveTimelineRefDoubleClickCheckout(
  timelineRef: TimelineRef,
  { isCurrent }: { isCurrent: boolean }
): TimelineRefCheckoutAction | null {
  if (isCurrent) return null

  switch (timelineRef.kind) {
    case 'branch':
      return { kind: 'ref', ref: timelineRef.label }
    case 'tag':
      return { kind: 'ref', ref: tagCheckoutRef(timelineRef.label) }
    case 'remote':
      return { kind: 'remote', remoteBranch: `remotes/${timelineRef.label}` }
  }
}

export function resolveCommitDoubleClickCheckout(commitHash: string): string {
  return commitHash
}
