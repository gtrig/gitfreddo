/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { DetailPanel } from './DetailPanel'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'
import type { GitWorkingStatus } from '@/lib/types'

const commit = makeCommit({ refs: ['main'] })
const headCommit = makeCommit({
  hash: 'cccccccccccccccccccccccccccccccccccccccc',
  shortHash: 'ccccccc',
  subject: 'Head commit',
  message: 'Head commit',
  parents: [commit.hash],
  refs: ['main']
})
const featureRoot = makeCommit({
  hash: 'dddddddddddddddddddddddddddddddddddddddd',
  shortHash: 'ddddddd',
  subject: 'Feature root',
  message: 'Feature root',
  parents: [],
  refs: ['feature']
})
const featureTip = makeCommit({
  hash: 'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  shortHash: 'eeeeeee',
  subject: 'Feature tip',
  message: 'Feature tip',
  parents: [featureRoot.hash],
  refs: ['feature']
})

const cherryPickMutate = vi.fn(async () => undefined)
const squashMutate = vi.fn(async () => undefined)

const emptyWorking: GitWorkingStatus = {
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

function makeMutation(mutate = vi.fn(async () => undefined)) {
  return { isPending: false, mutateAsync: mutate }
}

vi.mock('@/components/MergeConflicts/MergeConflictsPanel', () => ({
  MergeConflictsPanel: () => <div>Merge conflicts detected — file.txt</div>
}))
vi.mock('@/components/WorkingTree/GitWorkingTree', () => ({
  GitWorkingTree: () => <div>0 file change on main</div>
}))
vi.mock('@/components/DetailPanel/CommitPreview', () => ({
  CommitPreview: ({ commit }: { commit: { subject: string } }) => <div>{commit.subject}</div>
}))
vi.mock('@/components/DetailPanel/StashPreview', () => ({
  StashPreview: ({ stash }: { stash: { message: string } }) => <div>Stash: {stash.message}</div>
}))
vi.mock('@/components/DetailPanel/ExplainCommitWithAi', () => ({
  ExplainCommitButton: () => null
}))

vi.mock('@/hooks/useGit', () => ({
  useLogGraph: vi.fn(() => ({
    data: { commits: [headCommit, commit, featureTip, featureRoot] }
  })),
  useRepoStatus: vi.fn(() => ({
    data: { head: headCommit.hash, branch: 'main', isDetached: false }
  })),
  useWorkingStatus: vi.fn(() => ({ data: emptyWorking })),
  useStashList: vi.fn(() => ({ data: [] })),
  useMergeStatus: vi.fn(() => ({
    data: {
      inProgress: true,
      kind: 'merge',
      conflictedPaths: ['file.txt'],
      incomingLabel: 'feature',
      currentBranch: 'main'
    },
    isLoading: false
  }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => ({
    cherryPick: makeMutation(cherryPickMutate),
    squashCommits: makeMutation(squashMutate),
    stageAdd: makeMutation(),
    mergeAbort: makeMutation(),
    mergeContinue: makeMutation(),
    rebaseContinue: makeMutation(),
    rebaseAbort: makeMutation(),
    rebaseSkip: makeMutation(),
    cherryPickContinue: makeMutation(),
    cherryPickAbort: makeMutation(),
    cherryPickSkip: makeMutation()
  }))
}))

import { useLogGraph, useStashList, useWorkingStatus } from '@/hooks/useGit'

const defaultGraph = { commits: [headCommit, commit, featureTip, featureRoot] }

describe('DetailPanel', () => {
  const showToast = vi.fn()

  afterEach(() => cleanup())

  beforeEach(() => {
    cherryPickMutate.mockClear()
    squashMutate.mockClear()
    showToast.mockClear()
    vi.mocked(useLogGraph).mockReturnValue({ data: defaultGraph } as unknown as ReturnType<typeof useLogGraph>)
    vi.mocked(useStashList).mockReturnValue({ data: [] } as unknown as ReturnType<typeof useStashList>)
    vi.mocked(useWorkingStatus).mockReturnValue({ data: emptyWorking } as unknown as ReturnType<typeof useWorkingStatus>)
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useSelectionStore.setState({
      timelineSelection: null,
      selectedCommitHashes: [],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn(async () => undefined) }
    })
  })

  it('renders nothing when disconnected', () => {
    useWorkspaceStore.setState({ connected: false })
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: headCommit.hash },
      selectedCommitHashes: [headCommit.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })

    const { container } = renderWithProviders(<DetailPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing without a timeline selection', () => {
    const { container } = renderWithProviders(<DetailPanel />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders merge conflicts panel for merge selection', () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'merge', id: 'merge' },
      selectedCommitHashes: [],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })
    renderWithProviders(<DetailPanel />)
    expect(screen.getByText(/merge conflicts detected/i)).toBeInTheDocument()
    expect(screen.getByText(/file\.txt/)).toBeInTheDocument()
  })

  it('renders working tree for working selection', () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'working', id: 'working' },
      selectedCommitHashes: [],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })
    renderWithProviders(<DetailPanel />)
    expect(screen.getByText(/file change on main/i)).toBeInTheDocument()
  })

  it('renders commit preview for a single commit selection', () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: headCommit.hash },
      selectedCommitHashes: [headCommit.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })
    renderWithProviders(<DetailPanel />)
    expect(screen.getByText('Head commit')).toBeInTheDocument()
    expect(screen.queryByText(/commits selected/i)).not.toBeInTheDocument()
  })

  it('renders stash preview for stash commits', () => {
    const stashCommit = makeCommit({
      hash: 'stashhashstashhashstashhashstashhashstashhash12',
      shortHash: 'stash12',
      refs: ['stash@{0}'],
      subject: 'WIP on main: abc1234 Subject line'
    })
    vi.mocked(useLogGraph).mockReturnValue({
      data: { commits: [stashCommit] }
    } as unknown as ReturnType<typeof useLogGraph>)
    vi.mocked(useStashList).mockReturnValue({
      data: [
        {
          index: 0,
          hash: stashCommit.hash,
          message: 'WIP on main',
          branch: 'main'
        }
      ]
    } as unknown as ReturnType<typeof useStashList>)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: stashCommit.hash },
      selectedCommitHashes: [stashCommit.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })

    renderWithProviders(<DetailPanel />)
    expect(screen.getByText('Stash: WIP on main')).toBeInTheDocument()
  })

  it('renders multi-commit bar and runs bulk actions', async () => {
    const showCompareCommitRange = vi.fn()
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: featureTip.hash },
      selectedCommitHashes: [featureRoot.hash, featureTip.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null,
      showCompareCommitRange,
      setPrimaryCommit: vi.fn()
    })

    renderWithProviders(<DetailPanel />)

    expect(screen.getByText('2 commits selected')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /copy hashes/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalled()
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/copied/i), 'info')

    await userEvent.click(screen.getByRole('button', { name: /^compare$/i }))
    expect(showCompareCommitRange).toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: /cherry-pick all/i }))
    await waitFor(() => {
      expect(cherryPickMutate).toHaveBeenCalledWith({
        hashes: [featureRoot.hash, featureTip.hash]
      })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/cherry/i), 'success')
  })

  it('squashes contiguous commits on the current branch', async () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: headCommit.hash },
      selectedCommitHashes: [commit.hash, headCommit.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null,
      setPrimaryCommit: vi.fn()
    })

    renderWithProviders(<DetailPanel />)
    await userEvent.click(screen.getByRole('button', { name: /^squash$/i }))

    await waitFor(() => {
      expect(squashMutate).toHaveBeenCalledWith({ hashes: [commit.hash, headCommit.hash] })
    })
    expect(showToast).toHaveBeenCalledWith(expect.stringMatching(/squash/i), 'success')
  })

  it('shows error toast when bulk action fails', async () => {
    cherryPickMutate.mockRejectedValueOnce(new Error('Cherry-pick blocked'))
    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: featureTip.hash },
      selectedCommitHashes: [featureRoot.hash, featureTip.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null,
      setPrimaryCommit: vi.fn()
    })

    renderWithProviders(<DetailPanel />)
    await userEvent.click(screen.getByRole('button', { name: /cherry-pick all/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Cherry-pick blocked', 'error')
    })
  })

  it('disables bulk actions when git is busy', () => {
    vi.mocked(useWorkingStatus).mockReturnValue({
      data: {
        ...emptyWorking,
        rebaseInProgress: true
      }
    } as unknown as ReturnType<typeof useWorkingStatus>)

    useSelectionStore.setState({
      timelineSelection: { kind: 'commit', id: featureTip.hash },
      selectedCommitHashes: [featureRoot.hash, featureTip.hash],
      selectedWorkingFile: null,
      selectedStashIndex: null,
      setPrimaryCommit: vi.fn()
    })

    renderWithProviders(<DetailPanel />)
    expect(screen.getByRole('button', { name: /^compare$/i })).toBeDisabled()
  })
})
