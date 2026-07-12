/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CommitPreview } from './CommitPreview'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { makeCommit } from '@/test/fixtures/commit'
import { useSelectionStore } from '@/stores/selection'
import { useWorkspaceStore } from '@/stores/workspace'
import { useToastStore } from '@/stores/toast'
import { useAiEnabled } from '@/hooks/useAppSettings'
import { useCommitDisplayFiles } from '@/hooks/useCommitDisplayFiles'

const aiFillMutate = vi.fn()
const showToast = vi.fn()

vi.mock('@/hooks/useCommitDisplayFiles', () => ({
  useCommitDisplayFiles: vi.fn(() => ({
    files: [{ path: 'README.md', kind: 'changed' as const }],
    loading: false,
    loadingAllFiles: false,
    error: null
  }))
}))

vi.mock('@/hooks/useAppSettings', () => ({
  useAiEnabled: vi.fn(() => false)
}))

vi.mock('@/hooks/useAiFill', () => ({
  useAiFill: () => ({ mutateAsync: aiFillMutate, isPending: false })
}))

vi.mock('@/components/DetailPanel/ExplainCommitWithAi', () => ({
  ExplainCommitButton: () => <button type="button">Explain with AI</button>
}))

describe('CommitPreview', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    aiFillMutate.mockReset()
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    useSelectionStore.setState({
      selectedCommitFile: null,
      selectedCommitHash: null
    })
    useWorkspaceStore.setState({
      tabs: [{ path: '/tmp/repo', connected: true, connecting: false }],
      activePath: '/tmp/repo',
      connected: true,
      workspacePath: '/tmp/repo',
      workspacePickerOpen: false
    })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'log.message') return 'Subject line\n\nBody text'
      return {}
    })
    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [{ path: 'README.md', kind: 'changed' as const }],
      loading: false,
      loadingAllFiles: false,
      error: null
    })
    vi.mocked(useAiEnabled).mockReturnValue(false)
  })

  it('renders commit subject, body, and file change summary', () => {
    const commit = makeCommit()
    renderWithProviders(<CommitPreview commit={commit} />)
    expect(screen.getByText('Subject line')).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
    expect(screen.getByText(/1 file change in commit/i)).toBeInTheDocument()
    expect(screen.getByText('Author')).toBeInTheDocument()
  })

  it('shows loading and error states for file changes', () => {
    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [],
      loading: true,
      loadingAllFiles: false,
      error: null
    })
    const { rerender } = renderWithProviders(<CommitPreview commit={makeCommit()} />)
    expect(screen.getByText(/loading file changes/i)).toBeInTheDocument()

    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [],
      loading: false,
      loadingAllFiles: false,
      error: new Error('boom')
    })
    rerender(<CommitPreview commit={makeCommit()} />)
    expect(screen.getByText(/could not load file changes/i)).toBeInTheDocument()
  })

  it('shows modified, added, and removed badges', () => {
    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [
        { path: 'a.ts', kind: 'changed' },
        { path: 'b.ts', kind: 'added' },
        { path: 'c.ts', kind: 'removed' }
      ],
      loading: false,
      loadingAllFiles: false,
      error: null
    })
    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    expect(screen.getByText(/1 modified/i)).toBeInTheDocument()
    expect(screen.getByText(/1 added/i)).toBeInTheDocument()
    expect(screen.getByText(/1 deleted/i)).toBeInTheDocument()
    expect(screen.getByText(/3 file change in commit/i)).toBeInTheDocument()
  })

  it('selects the first changed file when view changes is clicked', async () => {
    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [
        { path: 'src/app.ts', kind: 'changed' },
        { path: 'src/util.ts', kind: 'added' }
      ],
      loading: false,
      loadingAllFiles: false,
      error: null
    })
    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    await userEvent.click(screen.getByRole('button', { name: /view changes/i }))
    expect(useSelectionStore.getState().selectedCommitFile).toBe('src/app.ts')
  })

  it('disables view changes when there are no changed files', () => {
    vi.mocked(useCommitDisplayFiles).mockReturnValue({
      files: [{ path: 'README.md', kind: 'unchanged' }],
      loading: false,
      loadingAllFiles: false,
      error: null
    })
    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    expect(screen.getByRole('button', { name: /view changes/i })).toBeDisabled()
  })

  it('opens commit detail and navigates to parent commit', async () => {
    const parentHash = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeef'
    const commit = makeCommit({ parents: [parentHash] })
    renderWithProviders(<CommitPreview commit={commit} />)

    await userEvent.click(screen.getByRole('button', { name: /open full commit view/i }))
    expect(useSelectionStore.getState().commitDetailHash).toBe(commit.hash)

    await userEvent.click(screen.getByRole('button', { name: /parent:/i }))
    expect(useSelectionStore.getState().timelineSelection).toEqual({
      kind: 'commit',
      id: parentHash
    })
  })

  it('opens reword modal from the reword button', async () => {
    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    await userEvent.click(screen.getByRole('button', { name: /reword/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('recomposes commit message with AI and opens reword modal with draft', async () => {
    vi.mocked(useAiEnabled).mockReturnValue(true)
    aiFillMutate.mockResolvedValue('feat: improved auth\n\nDetails from AI')

    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    await userEvent.click(screen.getByRole('button', { name: /^recompose$/i }))

    await waitFor(() => {
      expect(aiFillMutate).toHaveBeenCalledWith(
        expect.objectContaining({ purpose: 'recompose_commit' })
      )
    })
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByDisplayValue('feat: improved auth')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Details from AI')).toBeInTheDocument()
  })

  it('shows a toast when AI recompose fails', async () => {
    vi.mocked(useAiEnabled).mockReturnValue(true)
    aiFillMutate.mockRejectedValue(new Error('AI unavailable'))

    renderWithProviders(<CommitPreview commit={makeCommit()} />)
    await userEvent.click(screen.getByRole('button', { name: /^recompose$/i }))

    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('AI unavailable', 'error')
    })
  })

  it('renders author initials for single and multi-word names', () => {
    const { rerender } = renderWithProviders(
      <CommitPreview commit={makeCommit({ author: { name: 'Ada', email: 'a@b.c', date: '2024-06-01T12:00:00Z' } })} />
    )
    expect(screen.getByText('AD')).toBeInTheDocument()

    rerender(
      <CommitPreview
        commit={makeCommit({
          author: { name: 'Grace Hopper', email: 'a@b.c', date: '2024-06-01T12:00:00Z' }
        })}
      />
    )
    expect(screen.getByText('GH')).toBeInTheDocument()
  })
})
