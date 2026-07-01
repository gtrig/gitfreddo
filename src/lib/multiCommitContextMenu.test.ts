import { describe, expect, it, vi } from 'vitest'
import type { GitCommit } from '@/lib/types'
import { buildMultiCommitContextMenuItems } from './multiCommitContextMenu'

function commit(hash: string, parents: string[] = []): GitCommit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents,
    message: hash,
    subject: hash,
    author: { name: 'Author', email: 'a@b.c', date: '2024-01-01T00:00:00+00:00' },
    refs: []
  }
}

const actions = {
  copyAllHashes: vi.fn(),
  cherryPickAll: vi.fn(),
  squashSelected: vi.fn(),
  dropSelected: vi.fn(),
  removeStaleSelected: vi.fn(),
  compareSelected: vi.fn()
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
})
