/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { DiffOverlay } from './DiffOverlay'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGit', () => ({
  useDiffWorking: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffStaged: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffShow: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useDiffCommitRange: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useStashDiff: vi.fn(() => ({ data: null, isLoading: false, error: null }))
}))

vi.mock('@/hooks/useGitMutations', () => ({
  useGitMutations: vi.fn(() => ({
    stageApplyPatch: { isPending: false, mutateAsync: vi.fn() }
  }))
}))

describe('DiffOverlay', () => {
  afterEach(() => cleanup())
  beforeEach(() => {
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    useSelectionStore.setState({
      diffMode: 'working',
      selectedWorkingFile: 'README.md',
      selectedCommitFile: null,
      selectedConflictFile: null,
      compareCommitRange: null
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
  })

  it('renders diff overlay header for working file selection', () => {
    renderWithProviders(<DiffOverlay onClose={vi.fn()} />)
    expect(screen.getByText('README.md')).toBeInTheDocument()
  })
})
