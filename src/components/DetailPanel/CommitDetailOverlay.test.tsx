/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen } from '@testing-library/react'
import { CommitDetailOverlay } from './CommitDetailOverlay'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock, defaultMockSettings } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'

vi.mock('@/hooks/useGit', () => ({
  useDiffShow: vi.fn(() => ({ data: null, isLoading: false, error: null })),
  useFileRead: vi.fn(() => ({ data: null, isLoading: false, error: null }))
}))

vi.mock('@/hooks/useCommitDisplayFiles', () => ({
  useCommitDisplayFiles: vi.fn(() => ({
    files: [{ path: 'README.md', status: 'modified' as const }],
    isLoading: false
  }))
}))

describe('CommitDetailOverlay', () => {
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
    vi.mocked(window.gitfreddo.getSettings).mockResolvedValue(defaultMockSettings)
  })

  it('renders expanded commit detail', () => {
    renderWithProviders(<CommitDetailOverlay commit={makeCommit()} onClose={vi.fn()} />)
    expect(screen.getByText('Subject line')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /close/i })).toBeInTheDocument()
  })
})
