/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useToastStore } from '@/stores/toast'
import { useWorkspaceStore } from '@/stores/workspace'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { RewordCommitModal } from './RewordCommitModal'
const commit = {
  hash: 'abc1234567890abcdef1234567890abcdef123456',
  shortHash: 'abc1234',
  parents: [],
  subject: 'First commit',
  body: '',
  message: 'First commit',
  author: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  committer: { name: 'A', email: 'a@test.com', date: '2024-01-01T00:00:00Z' },
  refs: [],
  notes: '',
  signature: null,
  stats: null
}

describe('RewordCommitModal', () => {
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
  it('renders reword commit dialog', () => {
    renderWithProviders(<RewordCommitModal open commit={commit} onClose={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  function cleanRepo(rewordError?: Error) {
    vi.mocked(window.gitfreddo.invoke).mockImplementation(async (method: string) => {
      if (method === 'working.status') return { isClean: true, staged: [], unstaged: [], untracked: [], conflicted: [] }
      if (method === 'commit.reword' && rewordError) throw rewordError
      return undefined
    })
  }

  it('rewords the commit with the edited summary and description', async () => {
    cleanRepo()
    const show = vi.fn()
    useToastStore.setState({ show })
    const onClose = vi.fn()
    renderWithProviders(<RewordCommitModal open commit={commit} onClose={onClose} />)

    const [summary, description] = screen.getAllByRole('textbox')
    await userEvent.clear(summary!)
    await userEvent.type(summary!, 'Better subject')
    await userEvent.type(description!, 'More detail')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reword commit' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Reword commit' }))

    await waitFor(() =>
      expect(window.gitfreddo.invoke).toHaveBeenCalledWith(
        'commit.reword',
        { hash: commit.hash, message: 'Better subject\n\nMore detail' },
        '/tmp/repo'
      )
    )
    expect(show).toHaveBeenCalledWith('Commit message updated.', 'success')
    expect(onClose).toHaveBeenCalled()
  })

  it('reports a failed reword and keeps the dialog open', async () => {
    cleanRepo(new Error('rebase conflict'))
    const show = vi.fn()
    useToastStore.setState({ show })
    const onClose = vi.fn()
    renderWithProviders(<RewordCommitModal open commit={commit} onClose={onClose} />)
    await waitFor(() => expect(screen.getByRole('button', { name: 'Reword commit' })).toBeEnabled())
    await userEvent.click(screen.getByRole('button', { name: 'Reword commit' }))
    await waitFor(() => expect(show).toHaveBeenCalledWith('rebase conflict', 'error'))
    expect(onClose).not.toHaveBeenCalled()
  })
})

