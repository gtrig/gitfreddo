import { describe, expect, it } from 'vitest'
import { buildCommitContextMenuItems } from '@/lib/context-menus/commitContextMenu'
import type { GitCommit, GitWorkingStatus } from '@/lib/types'

const baseCommit: GitCommit = {
  hash: 'aaa111111111111111111111111111111111111',
  shortHash: 'aaa1111',
  parents: ['bbb222222222222222222222222222222222222'],
  message: 'Head commit',
  subject: 'Head commit',
  body: '',
  author: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
  committer: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
  signature: null,
  notes: '',
  stats: null,
  refs: ['main']
}

const parentCommit: GitCommit = {
  hash: 'bbb222222222222222222222222222222222222',
  shortHash: 'bbb2222',
  parents: [],
  message: 'Parent commit',
  subject: 'Parent commit',
  body: '',
  author: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
  committer: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
  signature: null,
  notes: '',
  stats: null,
  refs: []
}

const cleanWorking: GitWorkingStatus = {
  branch: 'main',
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

const noopActions = {
  selectCommit: () => {},
  copyHash: () => {},
  copyShortHash: () => {},
  explainCommits: () => {},
  copyAllHashes: () => {},
  compareSelected: () => {},
  cherryPickAll: () => {},
  cherryPickAllNoCommit: () => {},
  interactiveRebase: () => {},
  squashSelected: () => {},
  dropSelected: () => {},
  removeStaleSelected: () => {},
  checkout: () => {},
  mergeBranch: () => {},
  createWorktreeFromCommit: () => {},
  createBranch: () => {},
  createTag: () => {},
  addNote: () => {},
  reword: () => {},
  rebaseOnto: () => {},
  cherryPick: () => {},
  cherryPickNoCommit: () => {},
  reset: () => {},
  deleteHead: () => {},
  dropCommits: () => {},
  revertCommit: () => {},
  removeStaleHistory: () => {},
  rebaseContinue: () => {},
  rebaseAbort: () => {},
  rebaseSkip: () => {},
  mergeContinue: () => {},
  mergeAbort: () => {},
  cherryPickContinue: () => {},
  cherryPickAbort: () => {},
  cherryPickSkip: () => {}
}

describe('buildCommitContextMenuItems', () => {
  it('shows delete actions for HEAD commit', () => {
    const items = buildCommitContextMenuItems({
      commit: baseCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: cleanWorking,
      selectedCommitId: baseCommit.hash,
      selectedCount: 1,
      selectedHashes: [baseCommit.hash],
      actions: noopActions
    })

    const labels = items.map((item) => item.label)
    expect(labels.some((label) => label.includes('Delete this commit (soft)'))).toBe(true)
    expect(labels.some((label) => label.includes('Reset soft'))).toBe(false)
  })

  it('shows drop and revert for historical commits', () => {
    const items = buildCommitContextMenuItems({
      commit: parentCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: cleanWorking,
      selectedCommitId: parentCommit.hash,
      selectedCount: 1,
      selectedHashes: [parentCommit.hash],
      actions: noopActions
    })

    const labels = items.map((item) => item.label)
    expect(labels.some((label) => label.includes('Drop commit from history'))).toBe(true)
    expect(labels.some((label) => label.includes('Revert commit'))).toBe(true)
    expect(labels.some((label) => label.includes('Reset soft'))).toBe(true)
  })

  it('keeps drop enabled with a dirty working tree so the modal can explain why', () => {
    const dirtyWorking: GitWorkingStatus = {
      ...cleanWorking,
      isClean: false,
      unstaged: [{ path: 'file.txt', status: 'modified' }]
    }

    const items = buildCommitContextMenuItems({
      commit: parentCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: dirtyWorking,
      selectedCommitId: parentCommit.hash,
      selectedCount: 1,
      selectedHashes: [parentCommit.hash],
      actions: noopActions
    })

    const dropItem = items.find((item) => item.id === 'drop')
    expect(dropItem?.disabled).toBe(false)
  })

  it('shows remove stale history for commits not on the current branch', () => {
    const offBranchCommit: GitCommit = {
      ...parentCommit,
      hash: 'ccc333333333333333333333333333333333333',
      shortHash: 'ccc3333',
      parents: [parentCommit.hash],
      message: 'Stale branch commit',
      subject: 'Stale branch commit'
    }

    const items = buildCommitContextMenuItems({
      commit: offBranchCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit, offBranchCommit],
      working: cleanWorking,
      selectedCommitId: offBranchCommit.hash,
      selectedCount: 1,
      selectedHashes: [offBranchCommit.hash],
      actions: noopActions
    })

    expect(items.find((item) => item.id === 'remove-stale')?.disabled).toBe(false)
    expect(items.find((item) => item.id === 'drop')).toBeUndefined()
  })

  it('offers to merge a local branch ref into the current branch', () => {
    const featureTip: GitCommit = {
      ...parentCommit,
      hash: 'ccc333333333333333333333333333333333333',
      shortHash: 'ccc3333',
      parents: [parentCommit.hash],
      message: 'Feature commit',
      subject: 'Feature commit',
      refs: ['feature/uptime']
    }

    const items = buildCommitContextMenuItems({
      commit: featureTip,
      head: baseCommit.hash,
      branch: 'master',
      isDetached: false,
      commits: [baseCommit, featureTip, parentCommit],
      working: cleanWorking,
      selectedCommitId: featureTip.hash,
      selectedCount: 1,
      selectedHashes: [featureTip.hash],
      actions: noopActions
    })

    const mergeItem = items.find((item) => item.id === 'merge-feature/uptime')
    expect(mergeItem?.label).toBe('Merge feature/uptime into master…')
    expect(mergeItem?.disabled).toBe(false)
  })

  it('does not offer merge when the commit branch is already checked out', () => {
    const items = buildCommitContextMenuItems({
      commit: baseCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: cleanWorking,
      selectedCommitId: baseCommit.hash,
      selectedCount: 1,
      selectedHashes: [baseCommit.hash],
      actions: noopActions
    })

    expect(items.some((item) => item.id.startsWith('merge-'))).toBe(false)
  })

  it('offers to create a worktree from a commit', () => {
    const items = buildCommitContextMenuItems({
      commit: parentCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: cleanWorking,
      selectedCommitId: parentCommit.hash,
      selectedCount: 1,
      selectedHashes: [parentCommit.hash],
      actions: noopActions
    })

    expect(items.find((item) => item.id === 'worktree')?.label).toBe('Checkout in new worktree…')
    expect(items.find((item) => item.id === 'worktree')?.disabled).toBe(false)
  })

  it('includes explain action for a single commit when AI is enabled', () => {
    const items = buildCommitContextMenuItems({
      commit: parentCommit,
      head: baseCommit.hash,
      branch: 'main',
      isDetached: false,
      commits: [baseCommit, parentCommit],
      working: cleanWorking,
      selectedCommitId: parentCommit.hash,
      selectedCount: 1,
      selectedHashes: [parentCommit.hash],
      actions: noopActions,
      aiEnabled: true
    })

    expect(items.find((item) => item.id === 'explain-commit')).toBeDefined()
  })
})
