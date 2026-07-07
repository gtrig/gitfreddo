import { describe, expect, it } from 'vitest'
import {
  resolveCommitDoubleClickCheckout,
  resolveTimelineRefDoubleClickCheckout
} from '@/lib/timeline/timelineRefCheckout'

describe('resolveTimelineRefDoubleClickCheckout', () => {
  it('checks out a local branch by name', () => {
    expect(
      resolveTimelineRefDoubleClickCheckout(
        { label: 'feature', kind: 'branch', fullRef: 'feature', sourceOrder: 0 },
        { isCurrent: false }
      )
    ).toEqual({ kind: 'ref', params: { name: 'feature' } })
  })

  it('skips checkout for the current branch', () => {
    expect(
      resolveTimelineRefDoubleClickCheckout(
        { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 },
        { isCurrent: true }
      )
    ).toBeNull()
  })

  it('checks out a tag using the local tag ref', () => {
    expect(
      resolveTimelineRefDoubleClickCheckout(
        { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 0 },
        { isCurrent: false }
      )
    ).toEqual({ kind: 'ref', params: { name: 'v1.0.0', detach: true } })
  })

  it('opens remote checkout for remote branches', () => {
    expect(
      resolveTimelineRefDoubleClickCheckout(
        { label: 'origin/main', kind: 'remote', fullRef: 'origin/main', sourceOrder: 0 },
        { isCurrent: false }
      )
    ).toEqual({ kind: 'remote', remoteBranch: 'remotes/origin/main' })
  })
})

describe('resolveCommitDoubleClickCheckout', () => {
  it('checks out the commit hash in detached HEAD', () => {
    expect(resolveCommitDoubleClickCheckout('abc123def')).toEqual({
      name: 'abc123def',
      detach: true
    })
  })
})
