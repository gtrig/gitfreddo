/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateGitHubRepoModal } from './CreateGitHubRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn()
}))

import { useGitHubStatus } from '@/hooks/useGitHubStatus'

describe('CreateGitHubRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when GitHub is not linked', () => {
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(<CreateGitHubRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />)

    expect(
      screen.getByText(/Connect GitHub in Settings → Integrations to create repositories/i)
    ).toBeInTheDocument()
  })

  it('resets form fields when reopened', async () => {
    const { rerender } = renderWithProviders(
      <CreateGitHubRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />
    )

    await userEvent.type(screen.getByPlaceholderText('my-new-repo'), 'temp-repo')

    rerender(<CreateGitHubRepoModal open={false} onClose={vi.fn()} onCreated={vi.fn()} />)
    rerender(<CreateGitHubRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />)

    expect(screen.getByPlaceholderText('my-new-repo')).toHaveValue('')
  })

  it('requires a repository name', async () => {
    renderWithProviders(<CreateGitHubRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /create repository/i }))
    expect(screen.getByText('Repository name is required')).toBeInTheDocument()
    expect(window.gitfreddo.githubCreateRepo).not.toHaveBeenCalled()
  })

  it('creates a public repository with optional description', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    const createdRepo = {
      id: 99,
      fullName: 'dev/widget',
      name: 'widget',
      owner: 'dev',
      private: false,
      cloneUrl: 'https://github.com/dev/widget.git',
      description: 'A widget',
      defaultBranch: 'main'
    }
    vi.mocked(window.gitfreddo.githubCreateRepo).mockResolvedValue(createdRepo)

    renderWithProviders(
      <CreateGitHubRepoModal open onClose={onClose} onCreated={onCreated} />
    )

    await userEvent.type(screen.getByPlaceholderText('my-new-repo'), 'widget')
    await userEvent.type(screen.getByPlaceholderText('Short description'), 'A widget')
    await userEvent.click(screen.getByRole('button', { name: /create repository/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubCreateRepo).toHaveBeenCalledWith({
        name: 'widget',
        description: 'A widget',
        private: false,
        autoInit: false
      })
    })
    expect(onCreated).toHaveBeenCalledWith(createdRepo)
    expect(onClose).toHaveBeenCalled()
  })

  it('creates a private repository with autoInit and custom submit label', async () => {
    renderWithProviders(
      <CreateGitHubRepoModal
        open
        autoInit
        submitLabel="Push existing repo"
        onClose={vi.fn()}
        onCreated={vi.fn()}
      />
    )

    await userEvent.type(screen.getByPlaceholderText('my-new-repo'), 'secret')
    await userEvent.click(screen.getByRole('button', { name: /^private$/i }))
    await userEvent.click(screen.getByRole('button', { name: /push existing repo/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubCreateRepo).toHaveBeenCalledWith({
        name: 'secret',
        description: undefined,
        private: true,
        autoInit: true
      })
    })
  })

  it('shows API errors inline', async () => {
    vi.mocked(window.gitfreddo.githubCreateRepo).mockRejectedValue(new Error('Name taken'))

    renderWithProviders(<CreateGitHubRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('my-new-repo'), 'taken')
    await userEvent.click(screen.getByRole('button', { name: /create repository/i }))

    await waitFor(() => {
      expect(screen.getByText('Name taken')).toBeInTheDocument()
    })
  })

  it('calls onClose from cancel button', async () => {
    const onClose = vi.fn()
    renderWithProviders(<CreateGitHubRepoModal open onClose={onClose} onCreated={vi.fn()} />)

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
