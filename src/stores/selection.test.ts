import { beforeEach, describe, expect, it } from 'vitest'
import {
  captureSelectionForWorkspace,
  clearSelectionSnapshot,
  migrateSelectionSnapshot,
  restoreSelectionForWorkspace,
  useSelectionStore
} from '@/stores/selection'
import type { GitCommit } from '@/lib/types'

function makeCommit(hash: string): GitCommit {
  const author = { name: 'Author', email: 'a@b.c', date: '2024-01-01' }
  return {
    hash,
    shortHash: hash.slice(0, 7),
    parents: [],
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

describe('useSelectionStore', () => {
  beforeEach(() => {
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: [],
      selectionAnchorHash: null,
      selectedCommitHash: null,
      selectedCommitFile: null,
      selectedWorkingFile: null,
      selectedConflictFile: null,
      selectedStashIndex: null,
      selectedStashFile: null,
      fileHistoryPath: null,
      commitDetailHash: null,
      diffMode: null,
      compareCommitRange: null,
      pendingAiProposals: {}
    })
  })

  it('toggles commit selection and clears when empty', () => {
    useSelectionStore.getState().toggleCommitSelection('abc')
    expect(useSelectionStore.getState().selectedCommitHashes).toEqual(['abc'])

    useSelectionStore.getState().toggleCommitSelection('abc')
    expect(useSelectionStore.getState().selectedCommitHashes).toEqual([])
    expect(useSelectionStore.getState().timelineSelection).toBeNull()
  })

  it('selects a commit range from the anchor', () => {
    const commits = [makeCommit('c1'), makeCommit('c2'), makeCommit('c3')]
    useSelectionStore.getState().selectTimelineNode('commit', 'c1')
    useSelectionStore.getState().selectCommitRange('c3', commits)
    expect(useSelectionStore.getState().selectedCommitHashes).toEqual(['c1', 'c2', 'c3'])
  })

  it('clears working selection when opening conflict diff', () => {
    useSelectionStore.getState().setSelectedWorkingFile('src/app.ts', 'working')
    useSelectionStore.getState().setSelectedConflictFile('src/app.ts')
    const state = useSelectionStore.getState()
    expect(state.diffMode).toBe('conflict')
    expect(state.selectedWorkingFile).toBeNull()
  })

  it('supports primary commit, compare range, stash, and AI proposal state', () => {
    const store = useSelectionStore.getState()
    store.toggleCommitSelection('primary')
    store.setPrimaryCommit('primary')
    expect(useSelectionStore.getState().selectedCommitHash).toBe('primary')

    store.showCompareCommitRange('old', 'new', 'Compare')
    expect(useSelectionStore.getState().compareCommitRange).toEqual({
      oldestHash: 'old',
      newestHash: 'new',
      label: 'Compare'
    })

    store.selectStash(2, 'stash-hash')
    expect(useSelectionStore.getState().selectedStashIndex).toBe(2)
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: 'stash-hash'
    })

    store.setSelectedStashFile('README.md')
    expect(useSelectionStore.getState().selectedStashFile).toBe('README.md')

    store.setSelectedCommitFile('src/app.ts')
    expect(useSelectionStore.getState().selectedCommitFile).toBe('src/app.ts')

    store.setPendingAiProposals('src/conflict.ts', [
      { hunkId: 0, text: 'resolved', analysis: '', confidence: 80 }
    ])
    expect(useSelectionStore.getState().pendingAiProposals['src/conflict.ts']).toHaveLength(1)

    store.clearPendingAiProposals('src/conflict.ts')
    expect(useSelectionStore.getState().pendingAiProposals['src/conflict.ts']).toBeUndefined()

    store.setSelectedWorkingFile('dirty.ts', 'staged')
    expect(useSelectionStore.getState().diffMode).toBe('staged')

    store.closeDiffOverlay()
    const cleared = useSelectionStore.getState()
    expect(cleared.selectedWorkingFile).toBeNull()
    expect(cleared.diffMode).toBeNull()
  })

  it('opens file history and clears diff overlay state', () => {
    useSelectionStore.getState().setSelectedWorkingFile('src/app.ts', 'working')
    useSelectionStore.getState().openFileHistory('README.md')
    const state = useSelectionStore.getState()
    expect(state.fileHistoryPath).toBe('README.md')
    expect(state.selectedWorkingFile).toBeNull()
    expect(state.diffMode).toBeNull()

    useSelectionStore.getState().closeFileHistory()
    expect(useSelectionStore.getState().fileHistoryPath).toBeNull()
  })
})

describe('selection workspace snapshots', () => {
  beforeEach(() => {
    clearSelectionSnapshot('/a')
    clearSelectionSnapshot('/b')
    useSelectionStore.setState({
      selectedCommitHashes: ['hash1'],
      selectedCommitHash: 'hash1',
      timelineSelection: { kind: 'commit', id: 'hash1' }
    })
  })

  it('captures and restores selection per workspace path', () => {
    useSelectionStore.getState().setPendingAiProposals('conflict.ts', [
      { hunkId: 0, text: 'resolved', analysis: '', confidence: 80 }
    ])
    captureSelectionForWorkspace('/a')
    useSelectionStore.setState({
      selectedCommitHashes: [],
      selectedCommitHash: null,
      timelineSelection: null,
      pendingAiProposals: { other: [] }
    })

    restoreSelectionForWorkspace('/a')
    expect(useSelectionStore.getState().selectedCommitHashes).toEqual(['hash1'])
    expect(useSelectionStore.getState().pendingAiProposals['conflict.ts']).toHaveLength(1)
  })

  it('clears AI proposals when restoring a workspace with no snapshot', () => {
    useSelectionStore.getState().setPendingAiProposals('leak.ts', [
      { hunkId: 0, text: 'x', analysis: '', confidence: 1 }
    ])
    restoreSelectionForWorkspace('/empty')
    expect(useSelectionStore.getState().pendingAiProposals).toEqual({})
  })

  it('migrates snapshots when a tab path changes', () => {
    captureSelectionForWorkspace('/old')
    migrateSelectionSnapshot('/old', '/new')
    useSelectionStore.setState({ selectedCommitHashes: [] })

    restoreSelectionForWorkspace('/new')
    expect(useSelectionStore.getState().selectedCommitHashes).toEqual(['hash1'])
  })

  it('opens and closes full-page commit detail', () => {
    useSelectionStore.getState().openCommitDetail('abc123')
    expect(useSelectionStore.getState().commitDetailHash).toBe('abc123')
    expect(useSelectionStore.getState().selectedCommitHash).toBe('abc123')

    useSelectionStore.getState().closeCommitDetail()
    expect(useSelectionStore.getState().commitDetailHash).toBeNull()
    expect(useSelectionStore.getState().selectedCommitFile).toBeNull()
  })
})
