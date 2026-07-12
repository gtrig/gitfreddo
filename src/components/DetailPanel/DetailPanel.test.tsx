/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { DetailPanel } from './DetailPanel'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGit', () => ({
  useLogGraph: vi.fn(() => ({ data: { commits: [] } })),
  useRepoStatus: vi.fn(() => ({ data: { head: 'abc', branch: 'main', isDetached: false } })),
  useWorkingStatus: vi.fn(() => ({ data: { staged: [], unstaged: [], untracked: [] } })),
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

describe('DetailPanel', () => {
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
  it('renders merge conflicts panel for merge selection', () => {
    useSelectionStore.setState({
      timelineSelection: { kind: 'merge', id: 'merge' },
      selectedCommitHashes: [],
      selectedWorkingFile: null,
      selectedStashIndex: null
    })
    renderWithProviders(<DetailPanel />)
    expect(screen.getByText(/merge conflicts detected/i)).toBeInTheDocument()
    expect(screen.getByText('file.txt')).toBeInTheDocument()
  })
})
