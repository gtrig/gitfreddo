/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GithubIntegrationCard } from './GithubIntegrationCard'
import { renderWithProviders } from '@/test/render'
import { createGitFreddoMock } from '@/test/mocks/gitfreddo'

const invalidate = vi.fn()
const setStatus = vi.fn()

vi.mock('@/hooks/useGitHubStatus', () => ({
  useGitHubStatus: vi.fn(),
  useInvalidateGitHubStatus: vi.fn(() => invalidate),
  useSetGitHubStatus: vi.fn(() => setStatus)
}))

describe('GithubIntegrationCard', () => {
  afterEach(() => cleanup())
  beforeEach(async () => {
    invalidate.mockClear()
    setStatus.mockClear()
    window.gitfreddo = createGitFreddoMock()
    const { useGitHubStatus } = await import('@/hooks/useGitHubStatus')
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: false, login: null, avatarUrl: null, sshKeyTitle: null },
      isLoading: false
    } as ReturnType<typeof useGitHubStatus>)
  })

  it('renders GitHub connect section', () => {
    renderWithProviders(<GithubIntegrationCard />)
    expect(screen.getByRole('heading', { name: 'GitHub' })).toBeInTheDocument()
  })

  it('connects with GitHub OAuth', async () => {
    vi.mocked(window.gitfreddo.githubConnect).mockResolvedValue({
      connected: true,
      login: 'octo',
      avatarUrl: null,
      sshKeyTitle: null
    })

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /connect with github/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubConnect).toHaveBeenCalled()
      expect(setStatus).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })

  it('disconnects when already connected', async () => {
    const { useGitHubStatus } = await import('@/hooks/useGitHubStatus')
    vi.mocked(useGitHubStatus).mockReturnValue({
      data: { connected: true, login: 'octo', avatarUrl: null, sshKeyTitle: 'GitFreddo key' },
      isLoading: false
    } as ReturnType<typeof useGitHubStatus>)

    renderWithProviders(<GithubIntegrationCard />)
    await userEvent.click(screen.getByRole('button', { name: /^disconnect$/i }))

    await waitFor(() => {
      expect(window.gitfreddo.githubDisconnect).toHaveBeenCalled()
      expect(invalidate).toHaveBeenCalled()
    })
  })
})
