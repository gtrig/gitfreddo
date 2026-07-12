/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForkBitbucketRepoModal } from './ForkBitbucketRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

import { useToastStore } from '@/stores/toast'

vi.mock('@/hooks/useBitbucketStatus', () => ({
  useBitbucketStatus: vi.fn()
}))

import { useBitbucketStatus } from '@/hooks/useBitbucketStatus'

const showToast = vi.fn()

describe('ForkBitbucketRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useBitbucketStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
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
      <ForkBitbucketRepoModal open onClose={vi.fn()} onForked={vi.fn()} />
    )

    expect(screen.getByText(/Connect Bitbucket in Settings/i)).toBeInTheDocument()
  })

  it('prefills workspace and repo from the initial URL', () => {
    renderWithProviders(
      <ForkBitbucketRepoModal
        open
        initialUrl="https://bitbucket.org/acme/widget.git"
        onClose={vi.fn()}
        onForked={vi.fn()}
      />
    )

    expect(screen.getByDisplayValue('acme')).toBeInTheDocument()
    expect(screen.getByDisplayValue('widget')).toBeInTheDocument()
  })

  it('forks a repository and calls onForked', async () => {
    const onForked = vi.fn()
    const onClose = vi.fn()
    const forkedRepo = {
      uuid: 'repo-1',
      fullName: 'dev/widget',
      name: 'widget',
      workspace: 'dev',
      owner: 'dev',
      cloneUrl: 'https://bitbucket.org/dev/widget.git',
      description: null,
      private: false,
      defaultBranch: 'main'
    }
    vi.mocked(window.gitfreddo.bitbucketForkRepo).mockResolvedValue(forkedRepo)

    renderWithProviders(
      <ForkBitbucketRepoModal
        open
        initialUrl="https://bitbucket.org/acme/widget.git"
        onClose={onClose}
        onForked={onForked}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))

    await waitFor(() => {
      expect(window.gitfreddo.bitbucketForkRepo).toHaveBeenCalledWith('acme', 'widget')
    })
    expect(onForked).toHaveBeenCalledWith(forkedRepo)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when fields are blank', async () => {
    renderWithProviders(
      <ForkBitbucketRepoModal open initialUrl="" onClose={vi.fn()} onForked={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/Enter workspace and repository name/i),
      'error'
    )
  })

  it('shows fork errors from the API', async () => {
    vi.mocked(window.gitfreddo.bitbucketForkRepo).mockRejectedValue(new Error('Fork denied'))

    renderWithProviders(
      <ForkBitbucketRepoModal
        open
        initialUrl="https://bitbucket.org/acme/widget.git"
        onClose={vi.fn()}
        onForked={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))
    expect(showToast).toHaveBeenCalledWith('Fork denied', 'error')
  })
})
