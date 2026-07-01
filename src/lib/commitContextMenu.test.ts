import { describe, expect, it } from 'vitest'
import { buildCommitContextMenuItems } from './commitContextMenu'
import type { GitCommit, GitWorkingStatus } from './types'

const baseCommit: GitCommit = {
  hash: 'aaa111111111111111111111111111111111111',
  shortHash: 'aaa1111',
  parents: ['bbb222222222222222222222222222222222222'],
  message: 'Head commit',
  subject: 'Head commit',
  author: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
  refs: ['main']
}

const parentCommit: GitCommit = {
  hash: 'bbb222222222222222222222222222222222222',
  shortHash: 'bbb2222',
  parents: [],
  message: 'Parent commit',
  subject: 'Parent commit',
  author: { name: 'Test', email: 'test@example.com', date: '2024-01-01' },
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
  copyAllHashes: () => {},
  compareSelected: () => {},
  cherryPickAll: () => {},
  squashSelected: () => {},
  dropSelected: () => {},
  checkout: () => {},
  createBranch: () => {},
  reword: () => {},
  rebaseOnto: () => {},
  cherryPick: () => {},
  reset: () => {},
  deleteHead: () => {},
  dropCommits: () => {},
  revertCommit: () => {},
  rebaseContinue: () => {},
  rebaseAbort: () => {},
  mergeContinue: () => {},
  mergeAbort: () => {}
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
})
