/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CommitTimeline } from './CommitTimeline'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { DEFAULT_TIMELINE_COLUMN_VISIBILITY } from '@/lib/timeline/timelineColumnVisibility'
import type { GitWorkingStatus } from '@/lib/types'

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

vi.mock('@/hooks/useGit', () => ({
  useLogGraph: vi.fn(() => ({ data: { commits: [], maxLane: 0 }, isLoading: false, error: null })),
  useBranches: vi.fn(() => ({ data: [], isLoading: false, error: null })),
  useRepoStatus: vi.fn(() => ({ data: { head: 'abc', branch: 'main', isDetached: false } })),
  useRemotes: vi.fn(() => ({ data: [] })),
  useStashList: vi.fn(() => ({ data: [] })),
  useTags: vi.fn(() => ({ data: [] })),
  useWorkingStatus: vi.fn(() => ({ data: emptyWorking, isLoading: false, error: null })),
  useMergeStatus: vi.fn(() => ({ data: null }))
}))
vi.mock('@/hooks/useTimelineColumnSizes', () => ({
  useTimelineColumnSizes: vi.fn(() => ({
    branchTagWidth: 120,
    graphColumnWidth: 80,
    metrics: { laneWidth: 12, nodeRadius: 4, rowHeight: 28 },
    resizing: false,
    setResizing: vi.fn(),
    onBranchTagResize: vi.fn(),
    onGraphLaneResize: vi.fn()
  }))
}))
vi.mock('@/hooks/useTimelineColumnVisibility', () => ({
  useTimelineColumnVisibility: vi.fn(() => ({
    visibility: DEFAULT_TIMELINE_COLUMN_VISIBILITY,
    toggleColumn: vi.fn()
  }))
}))

describe('CommitTimeline', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
  })
  it('renders timeline when connected', () => {
    renderWithProviders(<CommitTimeline />)
    expect(screen.getByRole('region', { name: /commit/i })).toBeInTheDocument()
    expect(screen.getByText('Branch / Tag')).toBeInTheDocument()
  })

  it('shows loading state while graph data is loading', async () => {
    const { useLogGraph } = await import('@/hooks/useGit')
    vi.mocked(useLogGraph).mockReturnValue({
      data: undefined,
      isLoading: true,
      error: null
    } as ReturnType<typeof useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('shows error state when graph loading fails', async () => {
    const { useLogGraph } = await import('@/hooks/useGit')
    vi.mocked(useLogGraph).mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Graph failed')
    } as ReturnType<typeof useLogGraph>)

    renderWithProviders(<CommitTimeline />)
    expect(screen.getByText('Graph failed')).toBeInTheDocument()
  })
})
