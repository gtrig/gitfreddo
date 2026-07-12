/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { MergeConflictsPanel } from './MergeConflictsPanel'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGit', () => ({
  useMergeStatus: vi.fn(() => ({
    data: {
      inProgress: true,
      kind: 'merge',
      conflictedPaths: ['file.txt'],
      incomingLabel: 'feature',
      currentBranch: 'main'
    },
    isLoading: false,
    error: null
  })),
  useWorkingStatus: vi.fn(() => ({
    data: { staged: [], unstaged: [], untracked: [], conflicted: [] }
  }))
}))

describe('MergeConflictsPanel', () => {
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
    useSelectionStore.setState({ selectedConflictFile: null })
  })
  it('renders conflict file list', () => {
    renderWithProviders(<MergeConflictsPanel />)
    expect(screen.getByText('file.txt')).toBeInTheDocument()
  })
})
