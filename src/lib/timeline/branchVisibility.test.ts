import { describe, expect, it } from 'vitest'
import type { GitBranch, GitCommit } from '@/lib/types'
import type { TimelineRef } from '@/lib/timeline/timelineRefs'
import {
  branchVisibilityKey,
  filterCommitsForVisibleBranches,
  filterTimelineRefsForVisibility,
  timelineRefVisibilityKey
} from '@/lib/timeline/branchVisibility'

function commit(hash: string, parents: string[] = [], refs: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    body: '',
    author: { name: 'a', email: 'a@b.c', date: '' },
    committer: { name: 'a', email: 'a@b.c', date: '' },
    signature: null,
    notes: '',
    stats: null,
    refs
  }
}

function localBranch(name: string, head: string, isCurrent = false): GitBranch {
  return {
    name,
    head,
    ahead: 0,
    behind: 0,
    isCurrent,
    isRemote: false
  }
}

describe('branchVisibilityKey', () => {
  it('uses branch name for local and remote branches', () => {
    expect(branchVisibilityKey(localBranch('feature', 'abc'))).toBe('feature')
    expect(
      branchVisibilityKey({
        name: 'remotes/origin/feature'
      })
    ).toBe('remotes/origin/feature')
  })
})

describe('timelineRefVisibilityKey', () => {
  it('maps timeline refs to branch visibility keys', () => {
    expect(
      timelineRefVisibilityKey({
        label: 'feature',
        kind: 'branch',
        fullRef: 'feature',
        sourceOrder: 0
      })
    ).toBe('feature')
    expect(
      timelineRefVisibilityKey({
        label: 'origin/feature',
        kind: 'remote',
        fullRef: 'origin/feature',
        sourceOrder: 0
      })
    ).toBe('remotes/origin/feature')
  })
})

describe('filterCommitsForVisibleBranches', () => {
  const commits = [
    commit('c1', [], ['main']),
    commit('c2', ['c1'], ['main', 'feature']),
    commit('c3', ['c2'], ['feature']),
    commit('c4', ['c1'], ['other'])
  ]
  const branches = [
    localBranch('main', 'c2', true),
    localBranch('feature', 'c3'),
    localBranch('other', 'c4')
  ]

  it('returns all commits when nothing is hidden', () => {
    const result = filterCommitsForVisibleBranches(commits, branches, new Set(), 'c2')
    expect(result.map((entry) => entry.hash)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('hides commits only reachable from hidden branches', () => {
    const hidden = new Set(['feature'])
    const result = filterCommitsForVisibleBranches(commits, branches, hidden, 'c2')
    expect(result.map((entry) => entry.hash)).toEqual(['c1', 'c2', 'c4'])
  })

  it('always keeps commits reachable from HEAD even when their branch is hidden', () => {
    const hidden = new Set(['main'])
    const result = filterCommitsForVisibleBranches(commits, branches, hidden, 'c2')
    expect(result.map((entry) => entry.hash)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })

  it('ignores hidden state for the current branch', () => {
    const hidden = new Set(['main'])
    const result = filterCommitsForVisibleBranches(
      commits,
      branches.map((branch) => ({ ...branch, isCurrent: branch.name === 'main' })),
      hidden,
      'c2'
    )
    expect(result.map((entry) => entry.hash)).toEqual(['c1', 'c2', 'c3', 'c4'])
  })
})

describe('filterTimelineRefsForVisibility', () => {
  const refs: TimelineRef[] = [
    { label: 'main', kind: 'branch', fullRef: 'main', sourceOrder: 0 },
    { label: 'origin/feature', kind: 'remote', fullRef: 'origin/feature', sourceOrder: 1 },
    { label: 'v1.0.0', kind: 'tag', fullRef: 'v1.0.0', sourceOrder: 2 }
  ]

  it('removes hidden branch refs but keeps tags', () => {
    const hidden = new Set(['remotes/origin/feature'])
    const result = filterTimelineRefsForVisibility(refs, hidden)
    expect(result.map((ref) => ref.label)).toEqual(['main', 'v1.0.0'])
  })
})
