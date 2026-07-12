/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useCommitContextMenu } from './useCommitContextMenu'
import { makeCommit } from '@/test/fixtures/commit'
import { useSelectionStore } from '@/stores/selection'
import { useToastStore } from '@/stores/toast'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useWorkspaceStore } from '@/stores/workspace'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key })
}))

vi.mock('./useAppSettings', () => ({
  useAiEnabled: () => false
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
  useWorkingStatus: () => ({ data: { isClean: true } })
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
})
