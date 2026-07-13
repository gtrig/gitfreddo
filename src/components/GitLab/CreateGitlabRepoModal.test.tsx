/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateGitlabRepoModal } from './CreateGitlabRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useGitlabStatus', () => ({
  useGitlabStatus: vi.fn()
}))

vi.mock('@/hooks/useGitlabRepos', () => ({
  useGitlabNamespaces: vi.fn()
}))

import { useGitlabStatus } from '@/hooks/useGitlabStatus'
import { useGitlabNamespaces } from '@/hooks/useGitlabRepos'

describe('CreateGitlabRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
    vi.mocked(useGitlabNamespaces).mockReturnValue({
      data: ['my-namespace'],
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when GitLab is not linked', () => {
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(
      <CreateGitlabRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />
    )

    expect(screen.getByText(/Connect GitLab in Settings/i)).toBeInTheDocument()
  })

  it('creates a repository and calls onCreated', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    vi.mocked(window.gitfreddo.gitlabCreateRepo).mockResolvedValue({
      id: 1,
      fullName: 'my-namespace/new-repo',
      name: 'new-repo',
      namespace: 'my-namespace',
      owner: 'my-namespace',
      cloneUrl: 'https://gitlab.com/my-namespace/new-repo.git',
      description: null,
      private: false,
      defaultBranch: 'main'
    })

    renderWithProviders(
      <CreateGitlabRepoModal open onClose={onClose} onCreated={onCreated} />
    )

    await userEvent.type(screen.getByLabelText(/repository name/i), 'new-repo')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          namespace: 'my-namespace',
          name: 'new-repo'
        })
      )
    })
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when name is blank', async () => {
    renderWithProviders(
      <CreateGitlabRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/Namespace and repository name are required/i)).toBeInTheDocument()
  })
})
