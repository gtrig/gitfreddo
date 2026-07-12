import { describe, expect, it, vi } from 'vitest'
import type { GitCommit } from '@/lib/types'
import { buildMultiCommitContextMenuItems } from '@/lib/context-menus/multiCommitContextMenu'
import { clickAllMenuItems } from '@/test/contextMenuTestUtils'

function commit(hash: string, parents: string[] = []): GitCommit {
  const author = { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' }
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    body: '',
    author,
    committer: author,
    signature: null,
    notes: '',
    stats: null,
    refs: []
  }
}

const actions = {
  copyAllHashes: vi.fn(),
  cherryPickAll: vi.fn(),
  cherryPickAllNoCommit: vi.fn(),
  interactiveRebase: vi.fn(),
  squashSelected: vi.fn(),
  dropSelected: vi.fn(),
  removeStaleSelected: vi.fn(),
  compareSelected: vi.fn(),
  explainCommits: vi.fn()
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

describe('buildMultiCommitContextMenuItems', () => {
  const allCommits = [commit('c3', ['c2']), commit('c2', ['c1']), commit('c1', [])]

  it('includes bulk actions for multiple contiguous commits', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[2]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions
    })

    expect(items.find((item) => item.id === 'copy-all-hashes')).toBeDefined()
    expect(items.find((item) => item.id === 'compare-selected')).toBeDefined()
    expect(items.find((item) => item.id === 'squash-selected')?.disabled).toBe(false)
  })

  it('disables squash when the selection is not contiguous', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[0]!, allCommits[2]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions
    })

    expect(items.find((item) => item.id === 'squash-selected')?.disabled).toBe(true)
  })

  it('enables drop for contiguous commits on the branch head line', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[0]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions
    })

    expect(items.find((item) => item.id === 'drop-selected')?.disabled).toBe(false)
  })

  it('includes explain action when AI is enabled', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[2]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions,
      aiEnabled: true
    })

    expect(items.find((item) => item.id === 'explain-selected')).toBeDefined()
  })

  it('invokes bulk action handlers when items are clicked', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[2]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions,
      aiEnabled: true
    })

    clickAllMenuItems(items)
    expect(actions.copyAllHashes).toHaveBeenCalled()
    expect(actions.explainCommits).toHaveBeenCalled()
  })

  it('enables remove stale history when all commits are off the current branch', () => {
    const forked = [
      commit('c3', ['c2']),
      commit('c2', ['c1']),
      commit('c1', []),
      commit('d2', ['d1']),
      commit('d1', ['c1'])
    ]
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [forked[3]!, forked[4]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits: forked,
      working: cleanWorking,
      actions
    })

    const removeStale = items.find((item) => item.id === 'remove-stale-selected')
    expect(removeStale?.disabled).toBe(false)
  })

  it('disables cherry-pick when the working tree is dirty', () => {
    const dirtyWorking = {
      ...cleanWorking,
      isClean: false,
      unstaged: [{ path: 'dirty.txt', status: 'modified' as const }]
    }
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[2]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: dirtyWorking,
      actions
    })

    expect(items.find((item) => item.id === 'cherry-pick-all')?.disabled).toBe(true)
    expect(items.find((item) => item.id === 'interactive-rebase')?.disabled).toBe(true)
  })

  it('invokes cherry-pick and drop handlers', () => {
    const items = buildMultiCommitContextMenuItems({
      selectedCommits: [allCommits[1]!, allCommits[0]!],
      head: 'c3',
      branch: 'feature',
      isDetached: false,
      allCommits,
      working: cleanWorking,
      actions
    })

    items.find((item) => item.id === 'cherry-pick-all')?.onClick()
    items.find((item) => item.id === 'drop-selected')?.onClick()
    expect(actions.cherryPickAll).toHaveBeenCalled()
    expect(actions.dropSelected).toHaveBeenCalled()
  })
})
