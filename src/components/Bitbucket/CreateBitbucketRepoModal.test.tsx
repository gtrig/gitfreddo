/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CreateBitbucketRepoModal } from './CreateBitbucketRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn()
}))

vi.mock('@/hooks/useBitbucketRepos', () => ({
  useBitbucketWorkspaces: vi.fn()
}))

import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'
import { useBitbucketWorkspaces } from '@/hooks/useBitbucketRepos'

describe('CreateBitbucketRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
      isLoading: false,
      error: null
    } as never)
    vi.mocked(useBitbucketWorkspaces).mockReturnValue({
      data: ['my-workspace'],
      isLoading: false,
      error: null
    } as never)
  })

  it('prompts to connect when Bitbucket is not linked', () => {
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: false, login: null },
      isLoading: false,
      error: null
    } as never)

    renderWithProviders(
      <CreateBitbucketRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />
    )

    expect(screen.getByText(/Connect Bitbucket in Settings/i)).toBeInTheDocument()
  })

  it('creates a repository and calls onCreated', async () => {
    const onCreated = vi.fn()
    const onClose = vi.fn()
    vi.mocked(window.gitfreddo.bitbucketCreateRepo).mockResolvedValue({
      uuid: 'repo-1',
      fullName: 'my-workspace/new-repo',
      name: 'new-repo',
      workspace: 'my-workspace',
      owner: 'my-workspace',
      cloneUrl: 'https://bitbucket.org/my-workspace/new-repo.git',
      description: null,
      private: false,
      defaultBranch: 'main'
    })

    renderWithProviders(
      <CreateBitbucketRepoModal open onClose={onClose} onCreated={onCreated} />
    )

    await userEvent.type(screen.getByLabelText(/name/i), 'new-repo')
    await userEvent.click(screen.getByRole('button', { name: /create/i }))

    await waitFor(() => {
      expect(window.gitfreddo.bitbucketCreateRepo).toHaveBeenCalledWith(
        expect.objectContaining({
          workspace: 'my-workspace',
          name: 'new-repo'
        })
      )
    })
    expect(onCreated).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when name is blank', async () => {
    renderWithProviders(
      <CreateBitbucketRepoModal open onClose={vi.fn()} onCreated={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /create/i }))
    expect(await screen.findByText(/Workspace and repository name are required/i)).toBeInTheDocument()
  })
})
