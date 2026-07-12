/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForkGitHubRepoModal } from './ForkGitHubRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'
import { useToastStore } from '@/stores/toast'

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn()
}))

import { useGitHubStatus } from '@/hooks/useGitHubStatus'

const showToast = vi.fn()

describe('ForkGitHubRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
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

    renderWithProviders(<ForkGitHubRepoModal open onClose={vi.fn()} onForked={vi.fn()} />)

    expect(
      screen.getByText(/Connect GitHub in Settings → Integrations to fork repositories/i)
    ).toBeInTheDocument()
  })

  it('prefills owner and repo from the initial URL', () => {
    renderWithProviders(
      <ForkGitHubRepoModal
        open
        initialUrl="https://github.com/acme/widget.git"
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
      id: 1,
      fullName: 'dev/widget',
      name: 'widget',
      owner: 'dev',
      private: false,
      cloneUrl: 'https://github.com/dev/widget.git',
      description: null,
      defaultBranch: 'main'
    }
    vi.mocked(window.gitfreddo.githubForkRepo).mockResolvedValue(forkedRepo)

    renderWithProviders(
      <ForkGitHubRepoModal
        open
        initialUrl="https://github.com/acme/widget.git"
        onClose={onClose}
        onForked={onForked}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^fork$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubForkRepo).toHaveBeenCalledWith('acme', 'widget')
    })
    expect(onForked).toHaveBeenCalledWith(forkedRepo)
    expect(showToast).toHaveBeenCalledWith('Repository forked.', 'success')
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when fields are blank', async () => {
    renderWithProviders(
      <ForkGitHubRepoModal open initialUrl="" onClose={vi.fn()} onForked={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /^fork$/i }))
    expect(showToast).toHaveBeenCalledWith('Enter owner and repository name.', 'error')
  })

  it('shows fork errors from the API', async () => {
    vi.mocked(window.gitfreddo.githubForkRepo).mockRejectedValue(new Error('Fork denied'))

    renderWithProviders(
      <ForkGitHubRepoModal
        open
        initialUrl="https://github.com/acme/widget.git"
        onClose={vi.fn()}
        onForked={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^fork$/i }))
    await waitFor(() => {
      expect(showToast).toHaveBeenCalledWith('Fork denied', 'error')
    })
  })

  it('calls onClose from cancel button', async () => {
    const onClose = vi.fn()
    renderWithProviders(
      <ForkGitHubRepoModal
        open
        initialUrl="https://github.com/acme/widget.git"
        onClose={onClose}
        onForked={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    expect(onClose).toHaveBeenCalled()
  })
})
