/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCommitContextMenu } from './useCommitContextMenu'
import { clickAllMenuItems } from '@/test/contextMenuTestUtils'
import { makeCommit } from '@/test/fixtures/commit'
import { useWorkingStatus } from './useGit'
import { useAiEnabled } from './useAppSettings'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('./useAppSettings', () => ({
  useAiEnabled: vi.fn(() => false)
}))

const mutateAsync = vi.fn(async () => undefined)

vi.mock('./useGitMutations', () => ({
  useGitMutations: () => ({
    checkout: { mutateAsync },
    cherryPick: { mutateAsync },
    squashCommits: { mutateAsync },
    rebaseStart: { mutateAsync },
    rebaseContinue: { mutateAsync },
    rebaseAbort: { mutateAsync },
    rebaseSkip: { mutateAsync },
    mergeContinue: { mutateAsync },
    mergeAbort: { mutateAsync },
    cherryPickContinue: { mutateAsync },
    cherryPickAbort: { mutateAsync },
    cherryPickSkip: { mutateAsync },
    revertCommit: { mutateAsync },
    reset: { mutateAsync }
  })
}))

vi.mock('./useGit', () => ({
  useWorkingStatus: vi.fn(() => ({ data: { isClean: true } }))
}))

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

function mouseEvent(x: number, y: number): React.MouseEvent {
  return {
    clientX: x,
    clientY: y,
    preventDefault: () => undefined,
    stopPropagation: () => undefined
  } as React.MouseEvent
}

describe('useCommitContextMenu', () => {
  const commit = makeCommit()
  const options = {
    head: commit.hash,
    branch: 'main',
    isDetached: false,
    commits: [commit]
  }

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    useWorkspaceStore.setState({
      connected: true,
      activePath: '/tmp/repo',
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({
      selectedCommitHashes: [],
      selectTimelineNode: vi.fn(),
      setPrimaryCommit: vi.fn(),
      showCompareCommitRange: vi.fn()
    })
    useToastStore.setState({ show: vi.fn(), clear: vi.fn(), message: null, tone: 'info' })
    mutateAsync.mockClear()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('opens and closes the context menu', () => {
    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(40, 60))
    })

    expect(result.current.menu).toEqual({
      commit,
      x: 40,
      y: 60
    })
    expect(result.current.items.length).toBeGreaterThan(0)

    act(() => {
      result.current.closeMenu()
    })

    expect(result.current.menu).toBeNull()
    expect(result.current.items).toEqual([])
  })

  it('selects the commit when opening menu on an unselected commit', () => {
    const selectTimelineNode = vi.fn()
    useSelectionStore.setState({ selectedCommitHashes: [], selectTimelineNode })

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(1, 2))
    })

    expect(selectTimelineNode).toHaveBeenCalledWith('commit', commit.hash)
  })

  it('sets primary commit when opening menu on an already selected commit', () => {
    const setPrimaryCommit = vi.fn()
    useSelectionStore.setState({
      selectedCommitHashes: [commit.hash],
      setPrimaryCommit
    })

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(1, 2))
    })

    expect(setPrimaryCommit).toHaveBeenCalledWith(commit.hash)
  })

  it('confirms merge-parent cherry-pick with the chosen mainline', () => {
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      parents: ['parent1hashparent1hashparent1hashparent1hash12', 'parent2hashparent2hashparent2hashparent2hash12']
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [mergeCommit]
        }),
      { wrapper }
    )

    act(() => {
      result.current.setMergeParentPick({ commit: mergeCommit, action: 'cherry-pick' })
    })

    act(() => {
      result.current.confirmMergeParentPick(2)
    })

    expect(mutateAsync).toHaveBeenCalledWith({ hash: mergeCommit.hash, mainline: 2 })
    expect(result.current.mergeParentPick).toBeNull()
  })

  it('invokes menu item handlers and modal setters', () => {
    const parent = makeCommit({
      hash: 'bbb222222222222222222222222222222222222',
      shortHash: 'bbb2222',
      parents: []
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          head: commit.hash,
          commits: [commit, parent]
        }),
      { wrapper }
    )

    act(() => {
      result.current.openMenu(parent, mouseEvent(3, 4))
    })
    clickAllMenuItems(result.current.items)

    act(() => {
      result.current.setCreateBranchAt(parent.hash)
      result.current.setCreateTagAt(parent.hash)
      result.current.setRewordCommit(parent)
      result.current.setNoteCommit(parent)
      result.current.setExplainCommits([parent])
      result.current.setDeleteModal({ action: 'drop', commits: [parent] })
      result.current.setRemoveStaleModal({ seedHash: parent.hash })
      result.current.setInteractiveRebaseModal({ commits: [parent] })
      result.current.setMergeSource('feature')
      result.current.setWorktreeFromCommit({
        hash: parent.hash,
        shortHash: parent.shortHash
      })
    })

    expect(result.current.createBranchAt).toBe(parent.hash)
    expect(result.current.explainCommits).toEqual([parent])
    expect(result.current.mergeSource).toBe('feature')
  })

  it('runs in-progress git operation handlers from the menu', async () => {
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        branch: 'main',
        ahead: 0,
        behind: 0,
        staged: [],
        unstaged: [],
        untracked: [],
        conflicted: [],
        isClean: true,
        mergeInProgress: true,
        rebaseInProgress: true,
        cherryPickInProgress: true
      }
    } as unknown as ReturnType<typeof useWorkingStatus>)

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(5, 6))
    })
    clickAllMenuItems(result.current.items)

    expect(mutateAsync).toHaveBeenCalled()
  })

  it('copies hash to clipboard and shows toast from menu actions', () => {
    const show = vi.fn()
    useToastStore.setState({ show, clear: vi.fn(), message: null, tone: 'info' })

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(7, 8))
    })

    const copyItem = result.current.items.find((item) => item.id === 'copy-hash')
    copyItem?.onClick()

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(commit.hash)
    expect(show).toHaveBeenCalled()
  })

  it('confirms merge-parent revert with the chosen mainline', () => {
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      parents: ['parent1hashparent1hashparent1hashparent1hash12', 'parent2hashparent2hashparent2hashparent2hash12']
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [mergeCommit]
        }),
      { wrapper }
    )

    act(() => {
      result.current.setMergeParentPick({ commit: mergeCommit, action: 'revert' })
    })

    act(() => {
      result.current.confirmMergeParentPick(1)
    })

    expect(mutateAsync).toHaveBeenCalledWith({ hash: mergeCommit.hash, mainline: 1 })
    expect(result.current.mergeParentPick).toBeNull()
  })

  it('confirms merge-parent cherry-pick without commit', () => {
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      parents: ['parent1hashparent1hashparent1hashparent1hash12', 'parent2hashparent2hashparent2hashparent2hash12']
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [mergeCommit]
        }),
      { wrapper }
    )

    act(() => {
      result.current.setMergeParentPick({ commit: mergeCommit, action: 'cherry-pick-no-commit' })
    })

    act(() => {
      result.current.confirmMergeParentPick(2)
    })

    expect(mutateAsync).toHaveBeenCalledWith({
      hash: mergeCommit.hash,
      noCommit: true,
      mainline: 2
    })
    expect(result.current.mergeParentPick).toBeNull()
  })

  it('no-ops confirmMergeParentPick when modal state is cleared', () => {
    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.confirmMergeParentPick(1)
    })

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('opens merge-parent picker when cherry-picking a merge commit from the menu', () => {
    const mergeCommit = makeCommit({
      hash: 'mergehashmergehashmergehashmergehashmergehash12',
      shortHash: 'merge12',
      parents: ['parent1hashparent1hashparent1hashparent1hash12', 'parent2hashparent2hashparent2hashparent2hash12']
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [mergeCommit]
        }),
      { wrapper }
    )

    act(() => {
      result.current.openMenu(mergeCommit, mouseEvent(9, 10))
    })

    const cherryPickItem = result.current.items.find((item) => item.id === 'cherry-pick')
    act(() => {
      cherryPickItem?.onClick()
    })

    expect(result.current.menu).toBeNull()
    expect(result.current.mergeParentPick).toEqual({
      commit: mergeCommit,
      action: 'cherry-pick'
    })
    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it('shows error toast when a mutation fails', async () => {
    const show = vi.fn()
    useToastStore.setState({ show, clear: vi.fn(), message: null, tone: 'info' })
    mutateAsync.mockRejectedValueOnce(new Error('reset failed'))

    const parent = makeCommit({
      hash: 'bbb222222222222222222222222222222222222',
      shortHash: 'bbb2222',
      parents: []
    })
    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          head: commit.hash,
          commits: [commit, parent]
        }),
      { wrapper }
    )

    act(() => {
      result.current.openMenu(parent, mouseEvent(11, 12))
    })

    const resetItem = result.current.items.find((item) => item.id === 'reset-soft')
    act(() => {
      resetItem?.onClick()
    })

    await vi.waitFor(() => {
      expect(show).toHaveBeenCalledWith('reset failed', 'error')
    })
  })

  it('runs multi-select compare and copy-all actions', () => {
    const older = makeCommit({
      hash: 'olderhasholderhasholderhasholderhasholderhash12',
      shortHash: 'older12',
      parents: [commit.hash]
    })
    const showCompareCommitRange = vi.fn()
    useSelectionStore.setState({
      selectedCommitHashes: [older.hash, commit.hash],
      showCompareCommitRange
    })

    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [commit, older]
        }),
      { wrapper }
    )

    act(() => {
      result.current.openMenu(commit, mouseEvent(13, 14))
    })

    result.current.items.find((item) => item.id === 'compare-selected')?.onClick()
    expect(showCompareCommitRange).toHaveBeenCalled()

    result.current.items.find((item) => item.id === 'copy-all-hashes')?.onClick()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      [older.hash, commit.hash].join('\n')
    )
  })

  it('opens explain modal when AI is enabled', () => {
    vi.mocked(useAiEnabled).mockReturnValue(true)

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(15, 16))
    })

    act(() => {
      result.current.items.find((item) => item.id === 'explain-commit')?.onClick()
    })

    expect(result.current.explainCommits).toEqual([commit])
    expect(result.current.menu).toBeNull()
  })

  it('captures branch name when creating a worktree from a commit', () => {
    const branchCommit = makeCommit({
      refs: ['main', 'feature']
    })
    useSelectionStore.setState({
      selectedCommitHashes: [branchCommit.hash]
    })

    const { result } = renderHook(
      () =>
        useCommitContextMenu(true, {
          ...options,
          commits: [branchCommit]
        }),
      { wrapper }
    )

    act(() => {
      result.current.openMenu(branchCommit, mouseEvent(17, 18))
    })

    act(() => {
      result.current.items.find((item) => item.id === 'worktree')?.onClick()
    })

    expect(result.current.worktreeFromCommit).toMatchObject({
      hash: branchCommit.hash,
      shortHash: branchCommit.shortHash,
      branchName: 'main'
    })
  })

  it('copies short hash from the menu', () => {
    const show = vi.fn()
    useToastStore.setState({ show, clear: vi.fn(), message: null, tone: 'info' })

    const { result } = renderHook(() => useCommitContextMenu(true, options), { wrapper })

    act(() => {
      result.current.openMenu(commit, mouseEvent(19, 20))
    })

    result.current.items.find((item) => item.id === 'copy-short')?.onClick()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(commit.shortHash)
    expect(show).toHaveBeenCalled()
  })
})
