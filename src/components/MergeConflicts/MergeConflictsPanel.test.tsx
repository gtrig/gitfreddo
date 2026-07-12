/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MergeConflictsPanel } from './MergeConflictsPanel'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const mutation = { mutateAsync: vi.fn(async () => undefined), isPending: false }

vi.mock('@/hooks/useGit', () => ({
  useMergeStatus: vi.fn(() => ({
    data: {
      inProgress: true,
      kind: 'merge',
      conflictedPaths: ['file.txt', 'other.txt'],
      incomingLabel: 'feature',
      currentBranch: 'main',
      mergeMessage: "Merge branch 'feature'"
    },
    isLoading: false,
    error: null
  })),
  useWorkingStatus: vi.fn(() => ({
    data: { staged: [], unstaged: [], untracked: [], conflicted: [{ path: 'file.txt' }] }
  }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: () => ({
    mergeAbort: mutation,
    mergeContinue: mutation,
    rebaseContinue: mutation,
    rebaseAbort: mutation,
    rebaseSkip: mutation,
    cherryPickContinue: mutation,
    cherryPickAbort: mutation,
    cherryPickSkip: mutation,
    stageAdd: mutation
  })
}))

describe('MergeConflictsPanel', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    mutation.mutateAsync.mockClear()
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
    expect(screen.getByText('other.txt')).toBeInTheDocument()
  })

  it('selects a conflict file when clicked', async () => {
    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByText('file.txt'))
    expect(useSelectionStore.getState().selectedConflictFile).toBe('file.txt')
  })

  it('aborts the merge from the footer actions', async () => {
    renderWithProviders(<MergeConflictsPanel />)
    await userEvent.click(screen.getByRole('button', { name: /abort merge/i }))
    expect(mutation.mutateAsync).toHaveBeenCalled()
  })
})
