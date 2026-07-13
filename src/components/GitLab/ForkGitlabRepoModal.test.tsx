/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ForkGitlabRepoModal } from './ForkGitlabRepoModal'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

import { useToastStore } from '@/stores/toast'

vi.mock('@/hooks/useGitlabStatus', () => ({
  useGitlabStatus: vi.fn()
}))

import { useGitlabStatus } from '@/hooks/useGitlabStatus'

const showToast = vi.fn()

describe('ForkGitlabRepoModal', () => {
  afterEach(() => cleanup())

  beforeEach(() => {
    showToast.mockClear()
    useToastStore.setState({ message: null, tone: 'info', show: showToast, clear: vi.fn() })
    window.gitfreddo = createGitFreddoMock()
    vi.mocked(useGitlabStatus).mockReturnValue({
      data: { connected: true, login: 'dev' },
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
      <ForkGitlabRepoModal open onClose={vi.fn()} onForked={vi.fn()} />
    )

    expect(screen.getByText(/Connect GitLab in Settings/i)).toBeInTheDocument()
  })

  it('prefills namespace and repo from the initial URL', () => {
    renderWithProviders(
      <ForkGitlabRepoModal
        open
        initialUrl="https://gitlab.com/acme/widget.git"
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
      namespace: 'dev',
      owner: 'dev',
      cloneUrl: 'https://gitlab.com/dev/widget.git',
      description: null,
      private: false,
      defaultBranch: 'main'
    }
    vi.mocked(window.gitfreddo.gitlabForkRepo).mockResolvedValue(forkedRepo)

    renderWithProviders(
      <ForkGitlabRepoModal
        open
        initialUrl="https://gitlab.com/acme/widget.git"
        onClose={onClose}
        onForked={onForked}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))

    await waitFor(() => {
      expect(window.gitfreddo.gitlabForkRepo).toHaveBeenCalledWith('acme', 'widget')
    })
    expect(onForked).toHaveBeenCalledWith(forkedRepo)
    expect(onClose).toHaveBeenCalled()
  })

  it('shows validation error when fields are blank', async () => {
    renderWithProviders(
      <ForkGitlabRepoModal open initialUrl="" onClose={vi.fn()} onForked={vi.fn()} />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))
    expect(showToast).toHaveBeenCalledWith(
      expect.stringMatching(/Enter namespace and repository name/i),
      'error'
    )
  })

  it('shows fork errors from the API', async () => {
    vi.mocked(window.gitfreddo.gitlabForkRepo).mockRejectedValue(new Error('Fork denied'))

    renderWithProviders(
      <ForkGitlabRepoModal
        open
        initialUrl="https://gitlab.com/acme/widget.git"
        onClose={vi.fn()}
        onForked={vi.fn()}
      />
    )

    await userEvent.click(screen.getByRole('button', { name: /fork/i }))
    expect(showToast).toHaveBeenCalledWith('Fork denied', 'error')
  })
})
