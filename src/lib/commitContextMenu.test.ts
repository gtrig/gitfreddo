import { describe, expect, it, vi } from 'vitest'
import type { GitCommit } from '@/lib/types'
import { buildCommitContextMenuItems } from './commitContextMenu'

function commit(
  hash: string,
  parents: string[] = [],
  refs: string[] = []
): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs
  }
}

const actions = {
  selectCommit: vi.fn(),
  copyHash: vi.fn(),
  copyShortHash: vi.fn(),
  checkout: vi.fn(),
  createBranch: vi.fn(),
  reword: vi.fn(),
  rebaseOnto: vi.fn(),
  cherryPick: vi.fn(),
  reset: vi.fn(),
    rebaseContinue: vi.fn(),
    rebaseAbort: vi.fn(),
    mergeContinue: vi.fn(),
    mergeAbort: vi.fn()
  }

const cleanWorking = {
  branch: 'feature',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  untracked: [],
  conflicted: [],
  isClean: true,
  mergeInProgress: false,
  rebaseInProgress: false,
  cherryPickInProgress: false
}

describe('buildCommitContextMenuItems', () => {
  const commits = [
    commit('c3', ['c2'], ['HEAD -> feature']),
    commit('c2', ['c1']),
    commit('c1', [])
  ]

  it('disables cherry-pick for commits already on the current branch', () => {
    const items = buildCommitContextMenuItems({
      commit: commits[1]!,
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      commits,
      working: cleanWorking,
      selectedCommitId: null,
      actions
    })

    const cherryPick = items.find((item) => item.id === 'cherry-pick')
    expect(cherryPick?.disabled).toBe(true)
    expect(cherryPick?.label).toContain('already in')
  })

  it('offers branch checkout when the commit carries a local branch ref', () => {
    const items = buildCommitContextMenuItems({
      commit: commit('c9', [], ['main']),
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      commits,
      working: cleanWorking,
      selectedCommitId: null,
      actions
    })

    expect(items.find((item) => item.id === 'checkout-main')?.label).toBe('Checkout main')
  })

  it('shows rebase controls while a rebase is in progress', () => {
    const items = buildCommitContextMenuItems({
      commit: commits[0]!,
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      commits,
      working: { ...cleanWorking, rebaseInProgress: true },
      selectedCommitId: 'c3',
      actions
    })

    expect(items.find((item) => item.id === 'rebase-continue')).toBeDefined()
    expect(items.find((item) => item.id === 'rebase-abort')).toBeDefined()
  })
})
